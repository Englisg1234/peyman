// Unit tests for CTA markup (task 6.3; Req 1.2, 1.7, 3.4).
// Node environment: markup is rendered with react-dom/server and inspected
// as a string. DOM behavior (focus, hover, press) is covered in Playwright.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeroActions } from "@/components/hero/hero-actions";
import { ButtonLink, type ButtonLinkVariant } from "@/components/ui/button-link";

/** Every opening `<a ...>` tag in the markup, in document order. */
function anchorTags(html: string): string[] {
  return html.match(/<a\b[^>]*>/g) ?? [];
}

/** Every `<a>` element's text content, in document order. */
function anchorLabels(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)].map((m) => m[1]);
}

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

function classList(tag: string): string[] {
  return (attr(tag, "class") ?? "").split(/\s+/).filter(Boolean);
}

describe("ButtonLink", () => {
  const variants: ButtonLinkVariant[] = ["primary", "secondary", "quiet"];

  it.each(variants)("renders a plain <a href> with no role or handlers (%s)", (variant) => {
    const html = renderToStaticMarkup(
      <ButtonLink href="#target" variant={variant}>
        Label
      </ButtonLink>,
    );
    const tags = anchorTags(html);
    expect(tags).toHaveLength(1);
    expect(html.startsWith("<a ")).toBe(true);
    expect(attr(tags[0], "href")).toBe("#target");
    expect(html).not.toMatch(/\srole=/);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/\stabindex=/i);
  });

  it.each(variants)("applies btn, btn-%s and type-cta classes", (variant) => {
    const html = renderToStaticMarkup(
      <ButtonLink href="#target" variant={variant} className="extra">
        Label
      </ButtonLink>,
    );
    const classes = classList(anchorTags(html)[0]);
    expect(classes).toEqual(expect.arrayContaining(["btn", `btn-${variant}`, "type-cta", "extra"]));
    // Exactly one variant class.
    expect(classes.filter((c) => /^btn-(primary|secondary|quiet)$/.test(c))).toEqual([`btn-${variant}`]);
  });

  it("renders the label verbatim", () => {
    const html = renderToStaticMarkup(
      <ButtonLink href="#target" variant="primary">
        Start a Conversation
      </ButtonLink>,
    );
    expect(anchorLabels(html)).toEqual(["Start a Conversation"]);
  });
});

describe("HeroActions", () => {
  const html = renderToStaticMarkup(<HeroActions />);
  const tags = anchorTags(html);

  it("renders Primary then Secondary with the exact approved labels", () => {
    expect(anchorLabels(html)).toEqual(["Start a Conversation", "Explore Advisory"]);
    expect(classList(tags[0])).toContain("btn-primary");
    expect(classList(tags[1])).toContain("btn-secondary");
  });

  it("links to the shipped Contact and Advisory routes", () => {
    expect(tags.map((t) => attr(t, "href"))).toEqual(["/contact", "/advisory"]);
  });

  it("marks the group for the CSS intro and never makes it non-interactive", () => {
    const group = html.match(/^<div\b[^>]*>/)?.[0];
    expect(group).toBeDefined();
    expect(classList(group!)).toContain("cta-group");
    expect(attr(group!, "data-intro")).toBe("cta");
    expect(html).not.toMatch(/\sinert\b/);
    expect(html).not.toMatch(/\saria-hidden=/);
    expect(html).not.toMatch(/\stabindex=/i);
    expect(html).not.toMatch(/\srole=/);
    expect(html).not.toMatch(/\son[a-z]+=/i);
  });
});
