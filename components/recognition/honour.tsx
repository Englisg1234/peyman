import type { Recognition } from "@/data/company";
import { MediaFrame } from "./media-frame";

export interface HonourProps {
  item: Recognition;
  level?: 2 | 3;
  sizes?: string;
}

/** One recognition: media frame, category, title, verbatim description and date/place. */
export function Honour({ item, level = 3, sizes = "(min-width: 64rem) 30vw, (min-width: 48rem) 45vw, 90vw" }: HonourProps) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <li className="honour" data-reveal="">
      <MediaFrame item={item} sizes={sizes} />
      <div className="stack" data-gap="sm">
        <p className="kicker kicker--accent" style={{ margin: 0 }}>
          {item.category}
        </p>
        <H className="t-h3">{item.title}</H>
        <p className="t-small">{item.body}</p>
        {item.meta && <p className="meta" style={{ margin: 0 }}>{item.meta}</p>}
      </div>
    </li>
  );
}
