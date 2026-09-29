// Content integrity: brief-sourced data, the insights registry and SEO helpers.
import { describe, expect, it } from "vitest";
import { company, founder, recognitions } from "@/data/company";
import { articles, getArticle } from "@/data/insights";
import { intelligenceAreas } from "@/data/intelligence";
import { services } from "@/data/services";
import { articleJsonLd, buildMetadata } from "@/lib/seo";
import { formatDate, siteUrl, staticRoutes } from "@/lib/site";

describe("brief-sourced content", () => {
  it("has the four service groups from the brief, in order", () => {
    expect(services.map((s) => s.title)).toEqual([
      "Capital Structuring & Financial Advisory",
      "Legal & Transactional Advisory",
      "Government Grant & Policy Advisory",
      "Fundraising Readiness & Deal Syndication",
    ]);
    expect(services.map((s) => s.subServices.length)).toEqual([4, 4, 3, 2]);
  });

  it("uses the documented founder and recognition facts, with no invented contact or images", () => {
    expect(`${founder.name}, ${founder.credentials}`).toBe("Omar Saud, MBA, MS, LL.B");
    expect(recognitions.map((r) => r.id)).toEqual(["top-performer", "dpiit", "ecosystem-leadership"]);
    expect(recognitions.every((r) => r.images.length === 0)).toBe(true);
    expect(founder.portrait).toBeNull();
    expect(company.email).toBeNull();
    expect(company.linkedin).toBeNull();
  });

  it("pairs every intelligence area with current advisory and a separate exploring note", () => {
    for (const a of intelligenceAreas) {
      expect(a.today.length).toBeGreaterThan(0);
      expect(a.exploring.length).toBeGreaterThan(0);
    }
  });
});

describe("insights registry", () => {
  it("has unique, URL-safe slugs and ISO dates", () => {
    const slugs = articles.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of articles) {
      expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(a.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(getArticle(a.slug)).toBe(a);
    }
  });
});

describe("SEO helpers", () => {
  it("builds canonical, OG and title metadata", () => {
    const m = buildMetadata({ title: "Advisory", description: "d", path: "/advisory" });
    expect(m.alternates?.canonical).toBe("/advisory");
    expect(m.title).toBe("Advisory");
    expect(m.openGraph).toMatchObject({ url: "/advisory", title: "Advisory · Peyman Consulting" });
  });

  it("builds Article JSON-LD", () => {
    const ld = articleJsonLd({ title: "T", description: "D", path: "/insights/t", published: "2026-09-28", author: "Peyman Consulting" });
    expect(ld).toMatchObject({ "@type": "Article", headline: "T", datePublished: "2026-09-28", dateModified: "2026-09-28" });
  });

  it("resolves the site URL from env and formats dates", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com/" })).toBe("https://example.com");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "not a url" })).toBe("http://localhost:3000");
    expect(formatDate("2026-01-05")).toBe("5 January 2026");
    expect(staticRoutes.map((r) => r.path)).toContain("/recognition");
  });
});
