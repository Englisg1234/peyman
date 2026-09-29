import Image from "next/image";
import Link from "next/link";
import { company } from "@/data/company";
import { services } from "@/data/services";
import { siteConfig } from "@/data/site-config";

const FIRM = [
  { href: "/about", label: "About" },
  { href: "/recognition", label: "Recognition" },
  { href: "/industries", label: "Who we support" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/insights", label: "Insights" },
] as const;

/**
 * Institutional footer (Server Component): identity and positioning with
 * the primary action, then advisory, firm and contact indexes, then legal.
 * Email and LinkedIn render only once real values exist in data/company.ts.
 */
export function SiteFooter() {
  const { poster } = siteConfig.emblem;
  // Static render: the year is fixed at build time and refreshes on deploy.
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" aria-labelledby="footer-title">
      <div className="wrap">
        <h2 id="footer-title" className="sr-only">
          Peyman Consulting
        </h2>
        <div className="site-footer__top">
          <div className="stack" data-gap="sm">
            <p style={{ display: "flex", alignItems: "center", gap: 12, margin: 0 }}>
              <Image src={poster.src} width={poster.width} height={poster.height} alt="" sizes="28px" quality={70} loading="lazy" style={{ inlineSize: "auto", blockSize: 32 }} />
              <span className="type-wordmark">{siteConfig.brand.wordmark.kind === "text" ? siteConfig.brand.wordmark.text : company.name}</span>
            </p>
            <p className="t-h3" style={{ maxInlineSize: "30ch", fontWeight: 400 }}>
              {company.positioning}
            </p>
          </div>
        </div>
        <div className="site-footer__cols">
          <nav className="site-footer__col--wide" aria-labelledby="footer-advisory">
            <h3 id="footer-advisory" className="site-footer__heading">
              Advisory
            </h3>
            <ul className="site-footer__list">
              {services.map((s) => (
                <li key={s.id}>
                  <Link className="site-footer__link" href={`/advisory#${s.id}`}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-firm">
            <h3 id="footer-firm" className="site-footer__heading">
              The firm
            </h3>
            <ul className="site-footer__list">
              {FIRM.map((l) => (
                <li key={l.href}>
                  <Link className="site-footer__link" href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h3 className="site-footer__heading">Office</h3>
            <address className="t-small" style={{ fontStyle: "normal", color: "var(--text)", paddingBlockStart: 9 }}>
              {company.location.label}
              <br />
              India
            </address>
          </div>
          <div>
            <h3 className="site-footer__heading">Contact</h3>
            <ul className="site-footer__list">
              <li>
                <Link className="site-footer__link" href="/contact">
                  Send an inquiry
                </Link>
              </li>
              {company.email && (
                <li>
                  <a className="site-footer__link" href={`mailto:${company.email}`}>
                    {company.email}
                  </a>
                </li>
              )}
              {company.linkedin && (
                <li>
                  <a className="site-footer__link" href={company.linkedin} rel="noopener noreferrer" target="_blank">
                    LinkedIn<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="site-footer__base">
          <p style={{ margin: 0 }}>
            © {year} {company.name}. {company.nameMeaning.sentence}
          </p>
          <ul className="site-footer__legal">
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
