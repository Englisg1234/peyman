import Image from "next/image";
import type { EmblemRendererProps } from "@/lib/site-config-schema";

export type RasterEmblemProps = EmblemRendererProps;

/** Quality from the next.config.ts `qualities` allow-list. */
const QUALITY = 70;

/**
 * Empty transparent SVG used as the next/image `placeholder`. It paints
 * nothing itself: it only makes next/image keep an inline `background-image`
 * on the <img> until the image has loaded and `decode()` has resolved (or it
 * failed). CSS keys the solid navy-950 placeholder off that inline style
 * (`.raster-emblem__img[style*="background-image"]`), so the color stays a
 * Palette token (Req 4.9) and no client code is added.
 */
const DECODE_PLACEHOLDER = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E";

/**
 * No-JS: next/image cannot clear its placeholder without hydration, so the
 * navy box would stay behind the emblem's transparent pixels forever. Without
 * JS the placeholder is dropped instead; the box is still reserved (CLS 0).
 */
const NOSCRIPT_CSS = ".raster-emblem__img{background-color:transparent!important}";

/**
 * Raster_Emblem, v1 renderer (design: Emblem rendering architecture; Req 2.6,
 * 5.1–5.3, 5.5, 16.2, 17.1). Imported only by the renderer-selection point
 * (components/hero/emblem-visual.tsx, Req 15.9).
 *
 * Fills the Emblem_Stage slot at 100% × 100% (`object-fit: contain`). The
 * emblem image is unfiltered, unmasked and unblended (Req 4.4).
 *
 * - `preload` (Next 16; replaces `priority`) emits one
 *   `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">`.
 *   `fetchPriority="high"` is set on the <img> too; `decoding="async"` keeps
 *   the decode off the frame that paints the headline and the CSS intro.
 * - `width` / `height` are the master's intrinsic pixels (Req 5.2).
 * - `alt=""`: decorative; the Brand_Mark carries the organization name (Req 5.3).
 * - Placeholder until decode (Req 16.2): see DECODE_PLACEHOLDER.
 * - Failure (Req 17.1): next/image clears the placeholder on error; the
 *   failure-only `::after` cover keeps the navy-950 box and hides the
 *   broken-image icon. The specular copy is never armed (task 16.5 checks
 *   `naturalWidth`).
 *
 * Specular copy (hero slot, D7): a second <img> with the same src, sizes and
 * quality, so the browser selects the same candidate URL and reuses the
 * response (no extra bytes). `display: none` at rest; task 16.5 arms the sweep
 * with `data-sweep="active"` on `.raster-emblem`. `fetchPriority="low"` stops
 * React from emitting a second image preload for it.
 */
export function RasterEmblem({ visual, slot, sizes, preload }: RasterEmblemProps) {
  const { poster } = visual;
  const common = {
    src: poster.src,
    width: poster.width,
    height: poster.height,
    sizes,
    quality: QUALITY,
    draggable: false,
  } as const;

  return (
    <div className="raster-emblem" data-emblem-slot={slot}>
      <Image
        {...common}
        alt=""
        preload={preload}
        fetchPriority={preload ? "high" : "low"}
        loading={preload ? undefined : "eager"}
        decoding="async"
        placeholder={DECODE_PLACEHOLDER}
        className="raster-emblem__img"
      />
      {slot === "hero" ? (
        <Image {...common} alt="" loading="eager" fetchPriority="low" decoding="async" className="raster-emblem__specular" />
      ) : null}
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
      </noscript>
    </div>
  );
}
