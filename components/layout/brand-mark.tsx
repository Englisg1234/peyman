import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { siteConfig } from "@/data/site-config";

/**
 * Brand_Mark (design: Header system; Req 4.4, 4.5, 4.6, 7.11, 17.2).
 *
 * A link to `/` (`next/link`, server-rendered as a plain `<a href="/">`,
 * working without JS; `prefetch={false}` since `/` is the current page in v1)
 * holding the emblem thumbnail and the
 * wordmark. The link's accessible name is `brand.homeLabel`
 * ("Peyman Consulting, home"), which contains the visible text, so
 * WCAG 2.5.3 Label in Name holds. Both images are decorative (`alt=""`).
 *
 * `aria-current` (Req 7.11): the Site_Header renders from the root layout,
 * a Server Component with no access to the pathname, and reading it with
 * `usePathname()` would add a fourth client leaf (Req 13.8). So the caller
 * passes `current`: `true` when the header renders for `/`, and `false` (the
 * default) everywhere else, including not-found. In v1 `/` is the only route
 * (Req 19.1). When more routes ship, each route (or its route-group layout)
 * states this explicitly.
 *
 * Thumbnail (Req 4.4, 17.2): the image fills a fixed box sized in CSS
 * (`.brand-mark__thumb`: 28 px tall, 32 px from 1024; width from the
 * Site_Config aspect ratio). The box keeps its size if the image fails, so
 * the header height and wordmark position never change; a failure-only CSS
 * cover (`.brand-mark__img::after`) hides the broken-image icon. Uniform scaling only:
 * no filter, mask, blend or overlay. It loads eagerly but is not preloaded,
 * so it never competes with the hero LCP image: `fetchPriority="low"` is what
 * stops React 19's SSR from auto-emitting `<link rel="preload" as="image">`
 * for every non-lazy `<img>` (next/image itself preloads only with `preload`).
 *
 * Wordmark (Req 4.5, 4.6): the typeset "PEYMAN CONSULTING" in the wordmark
 * role (authored uppercase in Site_Config, never transformed), or a supplied
 * wordmark asset in a fixed-height box (16 px, 18 px from 1024).
 */
export interface BrandMarkProps {
  /** True when rendered on the `/` route; sets `aria-current="page"`. */
  current?: boolean;
}

/** Rendered thumbnail widths: 28 px tall → ~24.5 px wide; 32 px → ~28 px. */
const THUMB_SIZES = "(min-width: 64rem) 32px, 28px";

/** Wordmark asset box heights in px (mirrors `.brand-mark__wordmark-asset`). */
const WORDMARK_ASSET_H = { base: 16, lg: 18 } as const;

export function BrandMark({ current = false }: BrandMarkProps) {
  const { brand, emblem } = siteConfig;
  const { poster } = emblem;
  const { wordmark } = brand;
  const thumbStyle = { "--brand-thumb-ratio": emblem.aspectRatio } as CSSProperties;

  let wordmarkNode;
  if (wordmark.kind === "text") {
    wordmarkNode = <span className="brand-mark__wordmark type-wordmark">{wordmark.text}</span>;
  } else {
    const ratio = wordmark.width / wordmark.height;
    const base = Math.ceil(WORDMARK_ASSET_H.base * ratio);
    const lg = Math.ceil(WORDMARK_ASSET_H.lg * ratio);
    wordmarkNode = (
      <span
        className="brand-mark__wordmark-asset"
        style={{ "--brand-wordmark-ratio": ratio } as CSSProperties}
      >
        <Image
          src={wordmark.src}
          width={wordmark.width}
          height={wordmark.height}
          alt=""
          sizes={`(min-width: 64rem) ${lg}px, ${base}px`}
          quality={70}
          loading="eager"
          fetchPriority="low"
          draggable={false}
          className="brand-mark__img"
        />
      </span>
    );
  }

  return (
    <Link
      href="/"
      prefetch={false}
      className="brand-mark"
      aria-label={brand.homeLabel}
      aria-current={current ? "page" : undefined}
    >
      <span className="brand-mark__thumb" style={thumbStyle}>
        <Image
          src={poster.src}
          width={poster.width}
          height={poster.height}
          alt=""
          sizes={THUMB_SIZES}
          quality={70}
          loading="eager"
          fetchPriority="low"
          draggable={false}
          className="brand-mark__img"
        />
      </span>
      {wordmarkNode}
    </Link>
  );
}
