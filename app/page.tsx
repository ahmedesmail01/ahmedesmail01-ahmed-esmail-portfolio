import { ResponsiveImage } from '@/components/responsive-image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { projects, posts, services, skills } from '@/lib/content';
import { SylvaHomeHero } from '@/components/sylva/hero';
import { ActionLink, ContactSection, JournalCard, ProcessSection, ProjectCard, SectionHeading, SiteFooter } from '@/components/sylva/site';
import styles from '@/components/sylva/sylva.module.css';

const featuredProjects = [...projects].sort((a, b) => Number(a.sample) - Number(b.sample));
const featuredServices = [services[0], services[5], services[2], services[6]];
const questions = [
  ['What kind of projects can we work on?', 'I build websites and web applications, including commerce experiences, learning platforms, business portals, and custom integrations. We can also focus on improving the performance or maintainability of an existing product.'],
  ['Can you work with an existing application?', 'Yes. We can start by understanding the current codebase and the parts that need attention, then scope a focused improvement, integration, or redesign around it.'],
  ['How do we decide the timeline and budget?', 'We first discuss the goals, essential features, current assets, and any deadline. From there, we can agree on a realistic scope and delivery plan before development starts.'],
  ['Do you collaborate with remote teams?', 'Yes. I’m based in Cairo and can collaborate remotely with founders, designers, and engineering teams. We’ll agree on a communication rhythm and review points that work for the project.'],
  ['What should I include in my first message?', 'A short description of the idea or problem, any existing website or designs, and your preferred timeline are enough to start. You don’t need a complete technical specification.'],
];

export default function Home() {
  return (
    <div className={styles.site} data-sylva-home>
      <a className={styles.skipLink} href="#work">Explore the portfolio</a>
      <main id="main-content">
        <h1 className={styles.visuallyHidden}>Ahmed Esmail — full-stack and frontend engineer</h1>
        <SylvaHomeHero />
        <div className={styles.container}>
          <div className={styles.expertiseStrip} aria-label="Engineering focus">
            <p>Thoughtful experiences.<br />Solid engineering underneath.</p>
            <div><span>Frontend development</span><span>Full-stack applications</span><span>Connected systems</span><span>Based in Cairo, Egypt</span></div>
          </div>
        </div>
        <section id="work" tabIndex={-1} className={`${styles.container} ${styles.section}`}>
          <SectionHeading eyebrow="01 / SELECTED WORK" title="Ideas brought into the real world." description="A closer look at a frontend contribution and independent concepts across learning, commerce, events, and infrastructure.">
            <ActionLink href="/project/" secondary>Explore all work</ActionLink>
          </SectionHeading>
          <div className={styles.projectGrid}>{featuredProjects.map((project, index) => <ProjectCard key={project.slug} project={project} index={index} />)}</div>
          <p className={styles.sectionNote}>Fittra highlights my frontend contribution. The remaining projects are independent concept studies. Cover images are illustrative.</p>
        </section>
        <section id="services" tabIndex={-1} className={styles.homeServices}>
          <div className={`${styles.container} ${styles.section}`}>
            <SectionHeading eyebrow="02 / HOW I CAN HELP" title="A thoughtful start. A stronger product." description="From a first website to the systems behind it, development shaped around what your business needs.">
              <ActionLink href="/services/" secondary>View all services</ActionLink>
            </SectionHeading>
            <div className={styles.homeServiceGrid}>{featuredServices.map((service, index) => <Link className={styles.homeService} href="/services/" key={service.title}>
              <span>0{index + 1} / DEVELOPMENT</span><h3>{service.title}</h3><p>{service.description}</p><ArrowUpRight size={25} strokeWidth={1.2} aria-hidden="true" />
            </Link>)}</div>
          </div>
        </section>
        <section id="about" tabIndex={-1} className={`${styles.container} ${styles.section}`}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutImage}>
              {/* Account for the portrait crop of this landscape source when selecting a resolution. */}
              <ResponsiveImage src="/landing-pages/inner-green-assets/card-ethos.jpg" alt="" sizes="(max-width: 760px) 690px, (max-width: 1100px) 780px, 840px" />
              <div><p className={styles.eyebrow}>CURIOUS BY NATURE. PRACTICAL BY DESIGN.</p><p>Room for ideas.<br />Roots for growth.</p></div>
            </div>
            <div className={styles.aboutCopy}>
              <p className={styles.eyebrow}>03 / THE PERSON BEHIND THE WORK</p>
              <h2>Hi, I’m Ahmed.<br />I connect the pieces.</h2>
              <p>I’m a full-stack and frontend engineer based in Cairo. I enjoy turning complex requirements into clear interfaces, connected systems, and applications that are easier to use.</p>
              <p>My work spans learning platforms, commerce, real estate, and business workflows. That means thinking beyond a single screen: how data moves, how a payment changes access, and how a product makes it into production.</p>
              <p>I care about the small details people feel and the foundations they never have to think about.</p>
              <ActionLink href="#contact" secondary>Let’s get to know your project</ActionLink>
              <p className={styles.aboutLocation}>Cairo, Egypt · Open to remote collaboration</p>
            </div>
          </div>
        </section>
        <section id="skills" tabIndex={-1} className={`${styles.container} ${styles.section} ${styles.skillsSection}`}>
          <SectionHeading eyebrow="THE TOOLKIT" title="The right tools. A connected whole." description="A flexible stack for the interface, the systems behind it, and the path to production." />
          <div className={styles.skillsGrid}>{skills.map(group => <div key={group.title} className={styles.skillGroup}><h3>{group.title}</h3><div className={styles.tags}>{group.items.map(item => <span key={item}>{item}</span>)}</div></div>)}</div>
        </section>
        <ProcessSection />
        <section id="journal" tabIndex={-1} className={styles.journalSection}>
          <div className={`${styles.container} ${styles.section}`}>
            <SectionHeading eyebrow="05 / FIELD NOTES" title="A few things along the way." description="Thoughts on building products, connecting systems, and making everyday engineering decisions.">
              <ActionLink href="/blogs/" secondary>Visit the journal</ActionLink>
            </SectionHeading>
            <div className={styles.journalGrid}>{posts.map((post, index) => <JournalCard key={post.slug} post={post} index={index} />)}</div>
          </div>
        </section>
        <section id="faq" tabIndex={-1} className={`${styles.container} ${styles.section}`}>
          <div className={styles.faqGrid}>
            <div className={styles.faqIntro}><p className={styles.eyebrow}>06 / BEFORE WE BEGIN</p><h2>A little clarity<br />goes a long way.</h2><p>A few answers to help you picture how we might work together.</p></div>
            <div className={styles.faqList}>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
          </div>
        </section>
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
