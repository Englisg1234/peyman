import Image from "next/image";
import type { Recognition } from "@/data/company";
import { siteConfig } from "@/data/site-config";

export interface MediaFrameProps {
  item: Recognition;
  sizes: string;
}

/**
 * Recognition media. Renders the first supplied image when one exists.
 * Until then the frame (same aspect the real asset will fill) shows a
 * composed, clearly non-photographic plate, different per medium:
 *   photograph  the emblem on a lit stage
 *   certificate a document outline with a seal
 *   gallery     three staggered frame outlines
 * The plate is decorative (`aria-hidden`); the text beside it carries meaning.
 */
export function MediaFrame({ item, sizes }: MediaFrameProps) {
  const image = item.images[0];
  const { poster } = siteConfig.emblem;
  const kind = item.media.kind;
  return (
    <figure className="media-frame" data-kind={kind}>
      {image ? (
        <Image src={image.src} alt={image.alt} sizes={sizes} quality={70} className="media-frame__img" />
      ) : (
        <div className="media-frame__plate" aria-hidden="true">
          {kind === "photograph" && (
            <Image src={poster.src} width={poster.width} height={poster.height} alt="" sizes="200px" quality={70} loading="lazy" className="media-frame__emblem" />
          )}
          {kind === "certificate" && (
            <span className="media-frame__doc">
              <span className="media-frame__seal" />
            </span>
          )}
          {kind === "gallery" && (
            <span className="media-frame__set">
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
      )}
    </figure>
  );
}
