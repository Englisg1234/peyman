import Link from "next/link";
import { LegalPage } from "@/components/sections/legal-page";
import { company } from "@/data/company";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms",
  description: "Terms of use for the Peyman Consulting website.",
  path: "/terms",
});

// General website terms. Review with counsel before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" intro="The terms that apply when you use this website." path="/terms" updated="28 September 2026">
      <h2>About this website</h2>
      <p>
        This website is provided by {company.name}, {company.location.label}, India, to describe our advisory services and to let
        you contact us. By using it, you agree to these terms.
      </p>
      <h2>No advice or engagement</h2>
      <p>
        Content on this website, including insights and articles, is general information. It is not financial, legal, tax or
        investment advice and should not be relied on as such. Sending an inquiry does not create an advisory, client or
        professional relationship; an engagement begins only when agreed in writing.
      </p>
      <h2>Confidential information</h2>
      <p>
        Please do not send confidential or commercially sensitive information through the inquiry form. We will arrange an
        appropriate channel, such as a non-disclosure agreement, if one is needed.
      </p>
      <h2>Intellectual property</h2>
      <p>
        The website’s content, name, emblem and design belong to {company.name} unless stated otherwise. You may share links to it,
        but may not reproduce its content or marks for commercial purposes without permission.
      </p>
      <h2>Availability and accuracy</h2>
      <p>
        We aim to keep the website accurate and available but do not guarantee that it is complete, current or uninterrupted. To
        the extent permitted by law, we are not liable for losses arising from its use.
      </p>
      <h2>Privacy</h2>
      <p>
        Our <Link href="/privacy">privacy notice</Link> explains how we handle information you submit.
      </p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>
      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent through our <Link href="/contact">contact form</Link>.
      </p>
    </LegalPage>
  );
}
