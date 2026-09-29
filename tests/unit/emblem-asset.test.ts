// Emblem asset integrity (task 4.3, Req 5.1, 19.3).
// Parses the PNG IHDR with Node built-ins only and checks the committed master
// against the values recorded in assets/emblem/README.md, so the test stays in
// sync with the preparation script's documented output.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MASTER = path.join(ROOT, "assets", "emblem", "peyman-emblem.png");
const README = path.join(ROOT, "assets", "emblem", "README.md");

const EXPECTED_WIDTH = 1003;
const EXPECTED_HEIGHT = 1144;
const DESIGN_ASPECT = 972 / 1108;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR_TYPE_RGBA = 6;

interface Ihdr {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
}

/** Reads the IHDR chunk, which the PNG spec requires to be first after the signature. */
function readIhdr(png: Buffer): Ihdr {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG file");
  const length = png.readUInt32BE(8);
  const type = png.toString("ascii", 12, 16);
  if (type !== "IHDR" || length !== 13) throw new Error(`first chunk is ${type} (${length} bytes), expected IHDR`);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bitDepth: png.readUInt8(24),
    colorType: png.readUInt8(25),
  };
}

const sha256 = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

/** Extracts a backticked SHA-256 from the README table row whose label matches exactly. */
function readmeSha(label: RegExp): string {
  const text = readFileSync(README, "utf8");
  const row = text.split(/\r?\n/).find((line) => {
    const cells = line.split("|").map((c) => c.trim());
    return cells.length > 2 && label.test(cells[1] ?? "");
  });
  const match = row?.match(/`([0-9a-f]{64})`/);
  if (!match?.[1]) throw new Error(`no SHA-256 found in README for ${label}`);
  return match[1];
}

/** Every file below `dir` (recursive); empty when the directory does not exist. */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

describe("emblem master (assets/emblem/peyman-emblem.png)", () => {
  const png = readFileSync(MASTER);
  const ihdr = readIhdr(png);

  it("is 1003×1144, 8-bit RGBA", () => {
    expect(ihdr.width).toBe(EXPECTED_WIDTH);
    expect(ihdr.height).toBe(EXPECTED_HEIGHT);
    expect(ihdr.colorType).toBe(COLOR_TYPE_RGBA);
    expect(ihdr.bitDepth).toBe(8);
  });

  it("keeps the aspect ratio within ±1% of the design's 972/1108", () => {
    const deviation = Math.abs(ihdr.width / ihdr.height / DESIGN_ASPECT - 1);
    expect(deviation).toBeLessThanOrEqual(0.01);
  });

  it("matches the SHA-256 recorded in assets/emblem/README.md", () => {
    expect(sha256(png)).toBe(readmeSha(/^SHA-256$/));
  });

  it("leaves the source reference/logo-alternative.png unmodified", () => {
    const source = readFileSync(path.join(ROOT, "reference", "logo-alternative.png"));
    expect(sha256(source)).toBe(readmeSha(/^Source SHA-256/));
  });
});

describe("unused logos are not shipped", () => {
  const unused = ["logo-primary.png", "logo-column.png"];
  const shipped = [...listFiles(path.join(ROOT, "assets")), ...listFiles(path.join(ROOT, "public"))];

  it.each(unused)("%s is not copied into assets/ or public/", (name) => {
    const refHash = sha256(readFileSync(path.join(ROOT, "reference", name)));
    const byName = shipped.filter((f) => path.basename(f).toLowerCase() === name);
    const byContent = shipped.filter((f) => sha256(readFileSync(f)) === refHash);
    expect(byName.map((f) => path.relative(ROOT, f))).toEqual([]);
    expect(byContent.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});
