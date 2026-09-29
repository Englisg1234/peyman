import { HeroActions } from "@/components/hero/hero-actions";
import { siteConfig } from "@/data/site-config";

/**
 * Hero text block (design: Component contracts; Req 1.1, 1.2, 3.1, 3.2,
 * 3.5–3.8, 3.10, 6.2, 6.4, 6.6, 15.4, 16.1, 19.4).
 *
 * DOM order (Req 3.1): Etymology_Note (only when enabled), h1 Headline,
 * Supporting_Copy, HeroActions (Primary then Secondary), Service_Index (only
 * when enabled). A disabled flag leaves its element out of the DOM entirely,
 * never hidden with CSS or `hidden` (Req 3.7). Every string comes from
 * Site_Config; this component holds no copy literals (Req 15.4).
 *
 * The block is the headline's inline-size container (`.hero-text` in
 * app/globals.css), so the h1 measure caps are container queries.
 *
 * The h1 is SSR text at opacity 1 from first paint (the mobile LCP element,
 * K5). `data-intro` names match `IntroTarget` in lib/motion-tokens.ts; the
 * CSS intro (task 15.1) only translates the headline, never fades it.
 *
 * `hero.emphasis` (a gold span inside the headline) is null in v1 and not
 * rendered here.
 */
export interface HeroCopyProps {
  /** `id` of the h1, referenced by the Hero section's `aria-labelledby`. */
  headlineId: string;
  /** Layout hooks from the Hero grid (placement only). */
  className?: string;
}

export function HeroCopy({ headlineId, className }: HeroCopyProps) {
  const { headline, supportingCopy, etymology, serviceIndex } = siteConfig.hero;
  const classes = ["hero-text", className].filter(Boolean).join(" ");

  // Etymology_Note: the IPA segment is wrapped in its own `lang` span, which
  // keeps its sourced lowercase under the meta role (Req 3.6, 6.6).
  const ipaAt = etymology.text.indexOf(etymology.ipa);

  return (
    <div className={classes}>
      {etymology.enabled && (
        <p className="hero-etymology type-meta">
          {ipaAt < 0 ? (
            etymology.text
          ) : (
            <>
              {etymology.text.slice(0, ipaAt)}
              <span lang={etymology.ipaLang}>{etymology.ipa}</span>
              {etymology.text.slice(ipaAt + etymology.ipa.length)}
            </>
          )}
        </p>
      )}
      <h1 id={headlineId} className="hero-headline type-display" data-intro="headline">
        {headline}
      </h1>
      <p className="hero-supporting type-body" data-intro="copy">
        {supportingCopy}
      </p>
      <HeroActions className="hero-actions" />
      {serviceIndex.enabled && (
        // role="list" keeps list semantics in Safari/VoiceOver with list-style: none.
        // Items are plain text: no links, buttons or focusable elements (Req 3.5).
        <ul role="list" aria-label={serviceIndex.label} className="hero-services type-meta">
          {serviceIndex.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
