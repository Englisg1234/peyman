import { CapabilityMatrix } from "@/components/advisory/capability-matrix";
import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { ArrowLink } from "@/components/ui/arrow-link";
import { services } from "@/data/services";

/** "What exactly can Peyman help with?" The four disciplines and their scope. */
export function Capabilities() {
  return (
    <Section id="advisory" labelledBy="capabilities-title">
      <SectionHeader
        id="capabilities-title"
        title="Advisory services"
        intro="Four disciplines, engaged individually or together, from inception to exit: the financial foundations, the legal instruments, the public funding and the investor readiness a growing venture needs."
        action={<ArrowLink href="/advisory">All advisory services</ArrowLink>}
      />
      <CapabilityMatrix items={services} />
    </Section>
  );
}
