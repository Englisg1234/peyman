import { ButtonLink } from "@/components/ui/button-link";
import { company } from "@/data/company";

export interface ContactBandProps {
  title?: string;
  body?: string;
  /** Pre-selects the inquiry form's area of interest. */
  interest?: string;
}

/**
 * Closing call to action shared by every page: what to do next, where the
 * firm is, and one primary action. Labels are the brief's CTAs (PDF p.1).
 */
export function ContactBand({
  title = "Discuss your situation with Peyman.",
  body = "Share your stage and the capital, legal, government or fundraising question in front of you, and schedule a consultation.",
  interest,
}: ContactBandProps) {
  const href = interest ? (`/contact?interest=${interest}` as const) : ("/contact" as const);
  return (
    <section className="contact-band" aria-labelledby="contact-band-title">
      <div className="wrap">
        <div className="contact-band__grid" data-reveal="">
          <div className="stack">
            <h2 id="contact-band-title" className="t-h2">
              {title}
            </h2>
            <p className="t-lede">{body}</p>
          </div>
          <div className="stack" data-gap="sm">
            <div className="actions">
              <ButtonLink href={href} variant="primary">
                {company.ctas.consult}
              </ButtonLink>
              <ButtonLink href="/contact?interest=partnership" variant="secondary">
                {company.ctas.partner}
              </ButtonLink>
            </div>
            <p className="t-small">Office: {company.location.label}, India</p>
          </div>
        </div>
      </div>
    </section>
  );
}
