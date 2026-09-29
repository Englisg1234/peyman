// Unit tests for the Hero content and Emblem_Stage markup (task 10.8; Req 1.2,
// 3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 15.4).
//
// Node environment: markup is rendered with react-dom/server and inspected as
// a string. The real next/image renders here (the PNG import resolves to a
// URL string under Vitest), so the Emblem_Stage is tested unmocked.
//
// Site_Config is mocked with a deep copy of the shipped config. Tests flip the
// Etymology_Note and Service_Index flags (and change strings) on that copy to
// show that the output follows Site_Config with no component edits; every
// test starts from the shipped values again (afterEach).
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Hero } from "@/components/hero/hero";
import { HeroCopy } from "@/components/hero/hero-copy";
import { siteConfig as mockedConfig } from "@/data/site-config";
import type { SiteConfig } from "@/lib/site-config-schema";

vi.mock("@/data/site-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/site-config")>();
  return { siteConfig: structuredClone(actual.siteConfig) };
});

/** Site_Config is deeply readonly; the test mutates its private mocked copy. */
type DeepMutable<T> = { -readonly [K in keyof T]: DeepMutable<T[K]> };
const siteConfig = mockedConfig as DeepMutable<SiteConfig>;

const SHIPPED_HERO = structuredClone(siteConfig.hero);
const SHIPPED_CTA = structuredClone(siteConfig.cta);

afterEach(() => {
  siteConfig.hero = structuredClone(SHIPPED_HERO);
  siteConfig.cta = structuredClone(SHIPPED_CTA);
});

// Approved strings, verbatim (Req 1.2, 3.5, 3.6).
const HEADLINE = "Bridging the Gap Between Innovation and Institutional Capital.";
const SUPPORTING =
  "Strategic financial, legal and government advisory for high-growth businesses navigating complex transactions, capital and regulation.";
const PRIMARY = "Start a Conversation";
const SECONDARY = "Explore Advisory";
const ETYMOLOGY = "Peyman /pejmɒːn/ (pay-mahn): a binding agreement of trust and loyalty";
const SERVICES = [
  "Capital Structuring & Financial Advisory",
  "Legal & Transactional Advisory",
  "Government Grant & Policy Advisory",
  "Fundraising Readiness & Deal Syndication",
];

const renderCopy = () => renderToStaticMarkup(<HeroCopy headlineId="hero-headline" />);

/** Minimal entity decoding for text read back from static markup. */
const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

/** Visible text content: tags (and their attributes) and <noscript>/<style> removed. */
function textContent(html: string): string {
  const stripped = html.replace(/<(noscript|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ");
  return decode(stripped).replace(/\s+/g, " ").trim();
}

/** Opening tags whose name matches, in document order. */
function tags(html: string, name: string): string[] {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? [];
}

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

/** Inner HTML of the first element `<name ...>` (no nested same-name elements). */
function inner(html: string, name: string): string | undefined {
  return html.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`))?.[1];
}

describe("HeroCopy with the shipped Site_Config", () => {
  const html = renderCopy();

  it("renders exactly one h1 with the exact headline", () => {
    expect(tags(html, "h1")).toHaveLength(1);
    expect(decode(inner(html, "h1")!)).toBe(HEADLINE);
    expect(attr(tags(html, "h1")[0], "id")).toBe("hero-headline");
    expect(html).not.toMatch(/<h[2-6]\b/);
  });

  it("orders Headline → Supporting_Copy → Primary → Secondary in the DOM", () => {
    const positions = [
      html.indexOf("<h1"),
      html.indexOf(`>${SUPPORTING}</p>`),
      html.indexOf(`>${PRIMARY}</a>`),
      html.indexOf(`>${SECONDARY}</a>`),
    ];
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("contains only the headline, one supporting paragraph and the two CTAs", () => {
    expect(tags(html, "p")).toHaveLength(1);
    expect(tags(html, "a")).toHaveLength(2);
    expect(textContent(html)).toBe(`${HEADLINE} ${SUPPORTING} ${PRIMARY} ${SECONDARY}`);
  });

  it("omits the disabled Etymology_Note and Service_Index from the DOM", () => {
    expect(html).not.toContain("hero-etymology");
    expect(html).not.toContain("hero-services");
    expect(html).not.toMatch(/<ul\b|<li\b/);
    expect(html).not.toContain("lang=");
    expect(html).not.toContain("pejm");
    expect(html).not.toContain("Advisory services");
    for (const item of SERVICES) expect(decode(html)).not.toContain(item);
  });

  it("contains no statistics, founder, award or social-proof text", () => {
    const text = textContent(html);
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(/%|\+/);
    expect(text).not.toMatch(/\b(founder|founded|award|awarded|winning|years|clients|trusted|ranked|recognized|since)\b/i);
  });
});

describe("HeroCopy follows Site_Config flags", () => {
  it("renders the Etymology_Note first, with the IPA in a fa-fonipa lang span", () => {
    siteConfig.hero.etymology.enabled = true;
    const html = renderCopy();

    const note = tags(html, "p")[0];
    expect(note).toContain("hero-etymology");
    expect(note).toContain("type-meta");
    expect(html.indexOf("hero-etymology")).toBeLessThan(html.indexOf("<h1"));
    expect(decode(textContent(inner(html, "p")!))).toBe(ETYMOLOGY);

    const spans = tags(html, "span");
    expect(spans).toHaveLength(1);
    expect(attr(spans[0], "lang")).toBe("fa-fonipa");
    expect(inner(html, "span")).toBe("/pejmɒːn/");
  });

  it("renders the Service_Index last as a labelled list of the 4 items verbatim", () => {
    siteConfig.hero.serviceIndex.enabled = true;
    const html = renderCopy();

    const lists = tags(html, "ul");
    expect(lists).toHaveLength(1);
    expect(attr(lists[0], "aria-label")).toBe("Advisory services");
    expect(html.indexOf("<ul")).toBeGreaterThan(html.indexOf(`>${SECONDARY}</a>`));

    const items = [...html.matchAll(/<li\b[^>]*>([^<]*)<\/li>/g)].map((m) => decode(m[1]));
    expect(items).toEqual(SERVICES);
    // Plain text only: nothing focusable inside the list (Req 3.5).
    expect(inner(html, "ul")).not.toMatch(/<(a|button)\b|tabindex/i);
  });

  it("renders both optional elements in order when both flags are on", () => {
    siteConfig.hero.etymology.enabled = true;
    siteConfig.hero.serviceIndex.enabled = true;
    const html = renderCopy();
    const order = [
      html.indexOf("hero-etymology"),
      html.indexOf("<h1"),
      html.indexOf(`>${SUPPORTING}</p>`),
      html.indexOf(`>${PRIMARY}</a>`),
      html.indexOf(`>${SECONDARY}</a>`),
      html.indexOf("<ul"),
    ];
    expect(order.every((p) => p >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("reflects changed strings with no component edits (Req 15.4)", () => {
    siteConfig.hero.headline = "Changed headline";
    siteConfig.hero.supportingCopy = "Changed copy";
    siteConfig.cta.primary.label = "Changed primary";
    const html = renderCopy();
    expect(inner(html, "h1")).toBe("Changed headline");
    expect(textContent(html)).toBe(`Changed headline Changed copy Changed primary ${SECONDARY}`);
    expect(html).not.toContain(HEADLINE);
  });
});

describe("Hero shell and Emblem_Stage", () => {
  const html = renderToStaticMarkup(<Hero />);
  const stageStart = html.indexOf('data-slot="emblem-stage"');
  const stage = html.slice(html.lastIndexOf("<div", stageStart));

  it("is a section labelled by the single h1", () => {
    const section = tags(html, "section")[0];
    expect(attr(section, "aria-labelledby")).toBe("hero-headline");
    expect(section).toContain("data-hero");
    expect(tags(html, "h1")).toHaveLength(1);
  });

  it("places the Emblem_Stage after the text block in the DOM", () => {
    expect(stageStart).toBeGreaterThan(html.indexOf(`>${SECONDARY}</a>`));
  });

  it("marks the Emblem_Stage aria-hidden with no focusable or named content", () => {
    const stageTag = stage.match(/^<div\b[^>]*>/)![0];
    expect(attr(stageTag, "aria-hidden")).toBe("true");
    expect(stage).not.toMatch(/<(a|button|input|canvas|svg|video)\b/);
    expect(stage).not.toMatch(/tabindex|aria-label|aria-live|role=/i);
    expect(textContent(stage)).toBe("");
  });

  it("renders the emblem and its specular copy with alt=\"\" only", () => {
    const imgs = tags(html, "img");
    expect(imgs).toHaveLength(2);
    for (const img of imgs) {
      expect(attr(img, "alt")).toBe("");
      expect(attr(img, "width")).toBe("1003");
      expect(attr(img, "height")).toBe("1144");
    }
    // React serializes the prop as `fetchPriority` (case-insensitive in HTML).
    expect(imgs[0]).toMatch(/\sfetchpriority="high"/i);
    expect(attr(imgs[1], "class")).toContain("raster-emblem__specular");
    expect(stage).toContain(imgs[0]);
    expect(stage).toContain(imgs[1]);
  });
});
