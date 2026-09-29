import Link from "next/link";
import { LegalPage } from "@/components/sections/legal-page";
import { company } from "@/data/company";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy",
  description: "How Peyman Consulting collects, uses and protects the information you share through this website.",
  path: "/privacy",
});

// Describes the site as built: one inquiry form, no analytics, no
// advertising cookies. Review with counsel before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice" intro="How we handle the information you share with us through this website." path="/privacy" updated="28 September 2026">
      <h2>Who we are</h2>
      <p>
        This website is operated by {company.name}, {company.location.label}, India. This notice explains what information the
        website collects and how it is used.
      </p>
      <h2>What we collect</h2>
      <p>When you send an inquiry through the <Link href="/contact">contact form</Link>, we collect:</p>
      <ul>
        <li>your name, company or startup name and email address;</li>
        <li>the service or area of interest you select; and</li>
        <li>the message you write.</li>
      </ul>
      <p>
        To protect the form from abuse, your network address is used briefly in server memory to limit repeated submissions. It
        is not stored with your inquiry.
      </p>
      <h2>How we use it</h2>
      <p>
        We use inquiry details only to review and respond to your inquiry and to keep a record of our correspondence. We do not
        sell your information or use it for advertising.
      </p>
      <h2>Where it is stored</h2>
      <p>
        Inquiries are stored with our database provider, Supabase, under access controls that prevent public reading. Our team may
        also receive a notification of new inquiries through our email or messaging tools.
      </p>
      <h2>Cookies and analytics</h2>
      <p>This website does not use analytics, advertising or tracking cookies.</p>
      <h2>Retention and your choices</h2>
      <p>
        We keep inquiries for as long as needed to respond and maintain our records. You may ask us to access, correct or delete
        the information you submitted by writing to us through the contact form.
      </p>
      <h2>Changes</h2>
      <p>We may update this notice. The date at the top shows when it last changed.</p>
    </LegalPage>
  );
}
