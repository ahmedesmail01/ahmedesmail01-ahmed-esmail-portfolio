import { Header, Footer } from "@/components/site-shell";
import { HeroSection } from "@/components/home/hero-section";
import { TechStrip } from "@/components/home/tech-strip";
import { WorkSection } from "@/components/home/work-section";
import { ServicesSection } from "@/components/home/services-section";
import { AboutSection } from "@/components/home/about-section";
import { SkillsSection } from "@/components/home/skills-section";
import { JournalSection } from "@/components/home/journal-section";
import { ContactSection } from "@/components/home/contact-section";
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <TechStrip />
        <WorkSection />
        <ServicesSection />
        <AboutSection />
        <SkillsSection />
        <JournalSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
