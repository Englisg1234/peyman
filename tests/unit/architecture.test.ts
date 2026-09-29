// Repository conformance (task 1.3).
// Static checks that keep running as files are added:
//   - exact dependency pins (Req 14.1)
//   - banned packages absent from package.json and package-lock.json (Req 14.3, 19.2)
//   - no `three/` directory and no empty or placeholder-only directory (Req 15.2)
//   - components/**/*.tsx: ≤ 150 physical lines, exactly one exported component (Req 15.3)
//   - no import cycles among project source (Req 15.5, 15.8)
//   - GSAP imported only from lib/gsap.ts and components/motion/* (Req 14.4)
// Uses only Node built-ins and Vitest; parsing is a lightweight scanner, not a full TS parser.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Directories that are generated, vendored, tooling-owned or reference-only. */
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".next-fixture",
  ".git",
  ".kiro",
  ".vscode",
  ".idea",
  "test-results",
  "playwright-report",
  "blob-report",
  "coverage",
  "out",
  "build",
  "qa",
  ".lighthouseci",
  "reference",
  "inspiration",
]);

const CODE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const PLACEHOLDER_FILES = new Set([".gitkeep", ".keep", ".placeholder"]);
const MAX_COMPONENT_LINES = 150;

// ---------------------------------------------------------------------------
// File-system helpers
// ---------------------------------------------------------------------------

const toPosix = (p: string) => p.split(path.sep).join("/");
const rel = (abs: string) => toPosix(path.relative(ROOT, abs));

interface DirEntry {
  abs: string;
  files: string[];
  dirs: string[];
}

/** Walks the project tree (minus exclusions) and returns every directory visited. */
function walkDirs(start = ROOT): DirEntry[] {
  const out: DirEntry[] = [];
  const visit = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // removed concurrently
    }
    const entry: DirEntry = { abs: dir, files: [], dirs: [] };
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (EXCLUDED_DIRS.has(e.name)) continue;
        entry.dirs.push(abs);
      } else if (e.isFile()) {
        entry.files.push(abs);
      }
    }
    out.push(entry);
    entry.dirs.forEach(visit);
  };
  visit(start);
  return out;
}

/** This file embeds import-shaped fixture strings for the detector self-checks, so it is not scanned. */
const SELF = fileURLToPath(import.meta.url);

function sourceFiles(): string[] {
  return walkDirs()
    .flatMap((d) => d.files)
    .filter((f) => CODE_EXTENSIONS.includes(path.extname(f)) && path.resolve(f) !== path.resolve(SELF));
}

function readText(abs: string): string {
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return "";
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
}

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------

// `<` and `>` are deliberately absent so JSX closing tags (`</a>`) are not read as regex literals.
const REGEX_PRECEDERS = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "~", "^"]);

/**
 * Removes comments while keeping strings, template literals and regex literals
 * intact (and newlines, so line numbers survive). Heuristic regex detection is
 * enough for this codebase's style.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  let lastSignificant = "";
  let lastWord = "";
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const start = i++;
      while (i < n && src[i] !== c) {
        if (src[i] === "\\") i++;
        else if (c !== "`" && src[i] === "\n") break;
        i++;
      }
      i++;
      out += src.slice(start, i);
      lastSignificant = c;
      lastWord = "";
      continue;
    }
    if (c === "/" && (lastSignificant === "" || REGEX_PRECEDERS.has(lastSignificant) || /^(return|typeof|case|do|else|in|of|void|yield|await)$/.test(lastWord))) {
      const start = i++;
      let inClass = false;
      while (i < n && src[i] !== "\n") {
        if (src[i] === "\\") i++;
        else if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) break;
        i++;
      }
      i++;
      while (i < n && /[a-z]/i.test(src[i])) i++;
      out += src.slice(start, i);
      lastSignificant = "/";
      lastWord = "";
      continue;
    }
    out += c;
    if (/[A-Za-z0-9_$]/.test(c)) {
      lastWord = /[A-Za-z0-9_$]/.test(src[i - 1] ?? "") ? lastWord + c : c;
      lastSignificant = c;
    } else if (!/\s/.test(c)) {
      lastSignificant = c;
      lastWord = "";
    }
    i++;
  }
  return out;
}

/** Every module specifier: static import/export-from, side-effect import, dynamic import(), require(). */
function importSpecifiers(src: string): string[] {
  const code = stripComments(src);
  const found: string[] = [];
  const patterns = [
    /\b(?:import|export)\s[^;'"`]*?\bfrom\s*(['"])([^'"\n]+)\1/g,
    /\bimport\s*(['"])([^'"\n]+)\1/g,
    /\bimport\s*\(\s*(['"`])([^'"`\n]+)\1\s*[,)]/g,
    /\brequire\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) found.push(m[2]);
  }
  return [...new Set(found)];
}

/** Resolves a relative or `@/` specifier to a project file, or null (package / asset outside the tree). */
function resolveImport(fromFile: string, spec: string, known: Set<string>): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const candidates = [base, ...CODE_EXTENSIONS.map((e) => base + e), ...CODE_EXTENSIONS.map((e) => path.join(base, "index" + e))];
  if (/\.[cm]?jsx?$/.test(base)) {
    const stem = base.replace(/\.[cm]?jsx?$/, "");
    candidates.push(stem + ".ts", stem + ".tsx");
  }
  for (const c of candidates) if (known.has(c)) return c;
  return null;
}

/** Finds every elementary cycle reachable by DFS (one representative per back edge). */
function findCycles(graph: Map<string, string[]>): string[][] {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const dfs = (node: string) => {
    color.set(node, GREY);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      const state = color.get(dep) ?? WHITE;
      if (state === GREY) cycles.push([...stack.slice(stack.indexOf(dep)), dep]);
      else if (state === WHITE) dfs(dep);
    }
    stack.pop();
    color.set(node, BLACK);
  };
  for (const node of [...graph.keys()].sort()) if ((color.get(node) ?? WHITE) === WHITE) dfs(node);
  return cycles;
}

/**
 * Names of the runtime (value) exports of a module. Type-only exports
 * (`export type`, `export interface`, `export type { … }`) are ignored.
 * Anonymous default exports are reported as "default".
 */
function valueExports(src: string): string[] {
  const code = stripComments(src);
  const names = new Set<string>();
  const add = (n: string | undefined) => names.add(n && n.length > 0 ? n : "default");

  for (const m of code.matchAll(/\bexport\s+default\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?/g)) add(m[1]);
  for (const m of code.matchAll(/\bexport\s+default\s+class\b\s*([A-Za-z_$][\w$]*)?/g)) add(m[1]);
  for (const m of code.matchAll(/\bexport\s+default\s+(?!(?:async\s+)?function\b|class\b)([A-Za-z_$][\w$]*)?\s*([;\n(]|$)?/g)) {
    // A bare identifier (`export default Foo;`) dedupes with its declaration; any other expression is "default".
    add(m[1] && m[2] !== "(" ? m[1] : undefined);
  }
  for (const m of code.matchAll(/\bexport\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of code.matchAll(/\bexport\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of code.matchAll(/\bexport\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of code.matchAll(/\bexport\s+(?:const|let|var)\s+(?!enum\b)([A-Za-z_$][\w$]*|[{[])/g)) {
    add(m[1] === "{" || m[1] === "[" ? "<destructured>" : m[1]);
  }
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const raw of m[1].split(",")) {
      const item = raw.trim();
      if (!item || /^type\s/.test(item)) continue;
      const parts = item.split(/\s+as\s+/);
      add(parts[parts.length - 1].trim());
    }
  }
  for (const m of code.matchAll(/\bexport\s*\*\s*(?:as\s+([A-Za-z_$][\w$]*)\s*)?from/g)) add(m[1] ?? "*");
  return [...names];
}

const isComponentName = (n: string) => n === "default" || /^[A-Z][A-Za-z0-9]*$/.test(n);

function physicalLines(text: string): number {
  if (text.length === 0) return 0;
  const lines = text.split(/\r\n|\r|\n/).length;
  return /(\r\n|\r|\n)$/.test(text) ? lines - 1 : lines;
}

const GSAP_SPECIFIER = /^(gsap|@gsap\/react)(\/|$)/;
const isGsapAllowed = (relPath: string) => relPath === "lib/gsap.ts" || relPath.startsWith("components/motion/");

// ---------------------------------------------------------------------------
// Detector self-checks (so the repository checks are never vacuous)
// ---------------------------------------------------------------------------

describe("conformance detectors", () => {
  it("finds static, side-effect, re-export, dynamic and require specifiers and ignores comments", () => {
    const src = [
      `import { a } from "./a";`,
      `import type { B } from '@/lib/b';`,
      `import "./side.css";`,
      `export { c } from "./c";`,
      `const m = await import("gsap/ScrollTrigger");`,
      `const r = require('@gsap/react');`,
      `// import x from "commented";`,
      `/* import("also-commented") */`,
      `const re = /from "nope"/; const url = "https://example.test";`,
    ].join("\n");
    expect(importSpecifiers(src).sort()).toEqual(
      ["./a", "@/lib/b", "./side.css", "./c", "gsap/ScrollTrigger", "@gsap/react"].sort(),
    );
    expect(importSpecifiers(src).filter((s) => GSAP_SPECIFIER.test(s))).toHaveLength(2);
  });

  it("detects a cycle and accepts a DAG", () => {
    expect(findCycles(new Map([["a", ["b"]], ["b", ["c"]], ["c", ["a"]]]))).toEqual([["a", "b", "c", "a"]]);
    expect(findCycles(new Map([["a", ["b", "c"]], ["b", ["c"]], ["c", []]]))).toEqual([]);
  });

  it("counts value exports and ignores type exports", () => {
    const one = `export interface FooProps { x: string }\nexport type T = 1;\nexport function Foo(p: FooProps) { return null; }\nexport default Foo;`;
    expect(valueExports(one)).toEqual(["Foo"]);
    const two = `export const Foo = () => null;\nexport function useThing() {}\nexport type { X } from "./x";`;
    expect(valueExports(two).sort()).toEqual(["Foo", "useThing"]);
    expect(valueExports(`export default function () { return null; }`)).toEqual(["default"]);
    expect(valueExports(`function A() {}\nfunction B() {}\nexport { A, B as C };`).sort()).toEqual(["A", "C"]);
  });
});

// ---------------------------------------------------------------------------
// Repository checks
// ---------------------------------------------------------------------------

interface PackageJson {
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
interface PackageLock {
  packages?: Record<string, { version?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>;
}

const pkg = readJson<PackageJson>("package.json");
const lock = readJson<PackageLock>("package-lock.json");
const declared = { ...pkg.dependencies, ...pkg.devDependencies };

/** Exact semver: no range operators, wildcards, x-ranges, tags, URLs or workspace protocols. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Req 14.3 / 19.2: animation, 3D, icon-kit, UI-kit and CSS-in-JS packages. */
const BANNED_PACKAGE = new RegExp(
  "^(" +
    [
      "lenis",
      "@studio-freight/lenis",
      "three",
      "@types/three",
      "@react-three/.+",
      "framer-motion",
      "motion",
      "lucide-react",
      "react-icons",
      "@heroicons/.+",
      "@fortawesome/.+",
      "@radix-ui/.+",
      "@mui/.+",
      "@chakra-ui/.+",
      "@headlessui/.+",
      "antd",
      "styled-components",
      "@emotion/.+",
      "@stitches/.+",
      "@vanilla-extract/.+",
    ].join("|") +
    ")$",
);

describe("dependency pins (Req 14.1)", () => {
  it("declares every dependency at an exact version", () => {
    const loose = Object.entries(declared).filter(([, v]) => !EXACT_VERSION.test(v));
    expect(loose, `non-exact versions: ${JSON.stringify(loose)}`).toEqual([]);
  });

  it("matches package.json in the lockfile root and installed entries", () => {
    const root = lock.packages?.[""] ?? {};
    const lockRoot = { ...root.dependencies, ...root.devDependencies };
    expect(lockRoot).toEqual(declared);
    const mismatched = Object.entries(declared)
      .filter(([name, v]) => lock.packages?.[`node_modules/${name}`]?.version !== v)
      .map(([name, v]) => `${name}: declared ${v}, locked ${lock.packages?.[`node_modules/${name}`]?.version}`);
    expect(mismatched).toEqual([]);
  });

  it("declares the Node engine and pins @types/node to the .nvmrc major", () => {
    expect(pkg.engines?.node).toBe(">=20.9.0");
    const nvmMajor = readText(path.join(ROOT, ".nvmrc")).trim().replace(/^v/, "").split(".")[0];
    expect(declared["@types/node"]?.split(".")[0]).toBe(nvmMajor);
  });
});

describe("banned packages (Req 14.3, 19.2)", () => {
  it("are absent from package.json", () => {
    expect(Object.keys(declared).filter((n) => BANNED_PACKAGE.test(n))).toEqual([]);
  });

  it("are absent from package-lock.json (direct and transitive)", () => {
    const names = Object.keys(lock.packages ?? {})
      .filter((k) => k.includes("node_modules/"))
      .map((k) => k.slice(k.lastIndexOf("node_modules/") + "node_modules/".length));
    expect(names.filter((n) => BANNED_PACKAGE.test(n))).toEqual([]);
  });
});

describe("directory hygiene (Req 15.2)", () => {
  const dirs = walkDirs().filter((d) => d.abs !== ROOT);

  it("has no three/ directory", () => {
    expect(dirs.map((d) => rel(d.abs)).filter((p) => path.posix.basename(p).toLowerCase() === "three")).toEqual([]);
  });

  it("has no empty or placeholder-only directory", () => {
    const byPath = new Map(walkDirs().map((d) => [d.abs, d]));
    const hasRealFile = (d: DirEntry): boolean =>
      d.files.some((f) => !PLACEHOLDER_FILES.has(path.basename(f))) ||
      d.dirs.some((sub) => {
        const entry = byPath.get(sub);
        return entry !== undefined && hasRealFile(entry);
      });
    expect(dirs.filter((d) => !hasRealFile(d)).map((d) => rel(d.abs))).toEqual([]);
  });
});

describe("component files (Req 15.3)", () => {
  const componentsDir = path.join(ROOT, "components");
  const componentFiles = existsSync(componentsDir) && statSync(componentsDir).isDirectory()
    ? walkDirs(componentsDir).flatMap((d) => d.files).filter((f) => f.endsWith(".tsx"))
    : [];

  it(`keeps every components/**/*.tsx at or below ${MAX_COMPONENT_LINES} physical lines`, () => {
    const over = componentFiles
      .map((f) => ({ file: rel(f), lines: physicalLines(readText(f)) }))
      .filter((r) => r.lines > MAX_COMPONENT_LINES);
    expect(over).toEqual([]);
  });

  it("exports exactly one React component (plus types) from each components/**/*.tsx", () => {
    const bad = componentFiles
      .map((f) => ({ file: rel(f), exports: valueExports(readText(f)) }))
      .filter((r) => r.exports.length !== 1 || !isComponentName(r.exports[0]));
    expect(bad).toEqual([]);
  });
});

describe("import graph", () => {
  const files = sourceFiles();
  const known = new Set(files);
  const specsByFile = new Map(files.map((f) => [f, importSpecifiers(readText(f))]));

  it("has no cycles among project source, including type-only imports (Req 15.5, 15.8)", () => {
    const graph = new Map<string, string[]>();
    for (const [file, specs] of specsByFile) {
      const deps = specs.map((s) => resolveImport(file, s, known)).filter((d): d is string => d !== null && d !== file);
      graph.set(file, [...new Set(deps)]);
    }
    expect(findCycles(graph).map((c) => c.map(rel).join(" -> "))).toEqual([]);
  });

  it("imports gsap / gsap/* / @gsap/react only in lib/gsap.ts and components/motion/* (Req 14.4)", () => {
    const offenders = [...specsByFile]
      .filter(([file]) => !isGsapAllowed(rel(file)))
      .flatMap(([file, specs]) => specs.filter((s) => GSAP_SPECIFIER.test(s)).map((s) => `${rel(file)}: ${s}`));
    expect(offenders).toEqual([]);
  });
});
