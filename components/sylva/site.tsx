import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ArrowUp } from 'lucide-react';
import { profile, type Project, posts } from '@/lib/content';
import { SiteNavigation } from './navigation';
import { ContactForm } from './contact-form';
import styles from './sylva.module.css';

export function ActionLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link href={href} className={`${styles.action} ${secondary ? styles.secondaryAction : ''}`}>{children}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>;
}

export function SylvaShell({ children, active }: { children: ReactNode; active?: 'work' | 'services' | 'journal' }) {
  return <div className={styles.site}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <SiteNavigation active={active} />{children}<SiteFooter />
  </div>;
}

export function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <section className={`${styles.container} ${styles.pageIntro}`}>
    <p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1>
    <p className={styles.introDescription}>{description}</p>
    {children && <div className={styles.introActions}>{children}</div>}
  </section>;
}

export function SectionHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return <header className={styles.sectionHeading}>
    <div><p className={styles.eyebrow}>{eyebrow}</p><h2>{title}</h2></div>
    {(description || children) && <div className={styles.sectionHeadingAside}>{description && <p>{description}</p>}{children}</div>}
  </header>;
}

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  return <Link href={`/project/${project.slug}/`} className={styles.projectCard}>
    <div className={styles.projectImage}>
      <Image src={project.image} alt={`Illustrative cover for ${project.title}`} width={1000} height={750} sizes="(max-width: 760px) 100vw, 50vw" />
      <span className={styles.imageBadge}>{project.sample ? 'Concept study' : 'Frontend contribution'}</span>
      <span className={styles.imageNumber}>{String(index + 1).padStart(2, '0')}</span>
      <span className={styles.roundArrow}><ArrowUpRight size={25} strokeWidth={1.3} aria-hidden="true" /></span>
    </div>
    <div className={styles.projectInfo}>
      <p className={styles.eyebrow}>{project.category}</p><h3>{project.title}</h3><p>{project.description}</p>
      <div className={styles.tags}>{project.techStack.map(item => <span key={item}>{item}</span>)}</div>
    </div>
  </Link>;
}

export function JournalCard({ post, index = 0 }: { post: typeof posts[number]; index?: number }) {
  return <Link href={`/blogs/${post.slug}/`} className={styles.journalCard}>
    <div className={styles.journalImage}><Image src={post.image} alt="" width={720} height={450} sizes="(max-width: 760px) 100vw, 33vw" /><span className={styles.imageBadge}>Note {String(index + 1).padStart(2, '0')}</span></div>
    <div className={styles.journalInfo}>
      <p className={styles.eyebrow}>{post.category} · {post.read}</p><h3>{post.title}</h3><p>{post.intro}</p>
      <span className={styles.readNote}>Read the note <ArrowUpRight size={19} strokeWidth={1.4} aria-hidden="true" /></span>
    </div>
  </Link>;
}

const process = [
  ['Understand', 'Start with the people, the problem, and what a useful outcome looks like. Together we define a clear scope.'],
  ['Shape', 'Map the key journeys, choose the right tools, and turn the scope into a practical plan for the build.'],
  ['Build', 'Develop in focused steps, share progress, and refine the details with feedback along the way.'],
  ['Release & grow', 'Test the important journeys, prepare deployment, and leave a clear foundation for what comes next.'],
];

export function ProcessSection() {
  return <section id="process" tabIndex={-1} className={`${styles.container} ${styles.section}`}>
    <SectionHeading eyebrow="04 / THE PROCESS" title="Good things grow from a clear plan." description="A collaborative approach that keeps the work understandable, from the first conversation to the release." />
    <div className={styles.processGrid}>{process.map(([title, description], index) => <article key={title} className={styles.processCard}>
      <span className={styles.processNumber}>{String(index + 1).padStart(2, '0')}<span aria-hidden="true">↗</span></span><h3>{title}</h3><p>{description}</p>
    </article>)}</div>
  </section>;
}

export function ContactSection() {
  return <section id="contact" tabIndex={-1} className={`${styles.container} ${styles.contactSection}`}>
    <div className={styles.contactPanel}>
      <div className={styles.contactCopy}>
        <p className={styles.eyebrow}>LET’S MAKE SOMETHING MEANINGFUL</p><h2>A new idea.<br />A little room<br /><span>to grow.</span></h2>
        <p>Have a product to build, a system to connect, or an experience to improve? Tell me what you have in mind.</p>
        <a className={styles.emailLink} href={`mailto:${profile.email}`}>{profile.email}<ArrowUpRight size={17} aria-hidden="true" /></a>
        <div className={styles.contactSocials}><a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a></div>
      </div><ContactForm />
    </div>
  </section>;
}

export function SiteFooter() {
  return <footer className={`${styles.container} ${styles.footer}`}>
    <div className={styles.footerTop}>
      <Link className={styles.footerBrand} href="/">Ahmed Esmail<span>Full-stack & frontend engineer</span></Link>
      <div className={styles.footerLinks}><Link href="/project/">Work</Link><Link href="/services/">Services</Link><Link href="/blogs/">Journal</Link><Link href="/#about">About</Link></div>
      <a className={styles.backToTop} href="#" aria-label="Back to top"><ArrowUp size={22} strokeWidth={1.5} aria-hidden="true" /></a>
    </div>
    <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Ahmed Esmail</span><span>Based in Cairo. Building for everywhere.</span><span>Thoughtfully built. Naturally curious.</span></div>
  </footer>;
}
