import Image from "next/image";
import { founder } from "@/data/company";
import { siteConfig } from "@/data/site-config";

/**
 * Founder portrait frame. No photograph was supplied, so the frame shows a
 * composed monogram plate (initials, name, credentials, faint emblem) in the
 * exact frame a real portrait will fill: 4:5 from 768 px, 16:11 on phones.
 */
export function Portrait() {
  const { poster } = siteConfig.emblem;
  const initials = founder.name
    .split(" ")
    .map((p) => p[0])
    .join("");
  return (
    <figure className="portrait" data-reveal="">
      <Image src={poster.src} width={poster.width} height={poster.height} alt="" sizes="(min-width: 48rem) 300px, 60vw" quality={70} loading="lazy" className="portrait__emblem" />
      <span className="portrait__monogram" aria-hidden="true">
        {initials}
      </span>
      <figcaption className="portrait__caption">
        <span className="t-h3" style={{ color: "var(--color-ivory-50)" }}>
          {founder.name}
        </span>
        <span className="t-small">{founder.role}</span>
      </figcaption>
    </figure>
  );
}
