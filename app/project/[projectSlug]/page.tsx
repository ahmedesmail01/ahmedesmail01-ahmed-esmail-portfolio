import { ResponsiveImage } from '@/components/responsive-image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projects } from '@/lib/content';
import {
  SylvaShell,
  PageIntro,
  ActionLink,
  ContactSection,
} from '@/components/sylva/site';
import styles from '@/components/sylva/sylva.module.css';

// Only publish project URLs generated from the content during the build.
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ projectSlug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;
  const project = projects.find((item) => item.slug === projectSlug);
  return { title: project?.title ?? 'Project not found', description: project?.description };
}

export default async function ProjectPage({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;
  const project = projects.find((item) => item.slug === projectSlug);
  if (!project) notFound();

  const orderedProjects = [...projects].sort((a, b) => Number(a.sample) - Number(b.sample));
  const nextProject = orderedProjects[(orderedProjects.indexOf(project) + 1) % orderedProjects.length];

  return (
    <SylvaShell active="work">
      <main id="main-content">
        <div className={styles.container}>
          <Link href="/project/" className={styles.backLink}>← All selected work</Link>
        </div>
        <PageIntro
          eyebrow={`${project.category} / ${project.sample ? 'CONCEPT STUDY' : 'FRONTEND CONTRIBUTION'}`}
          title={project.title}
          description={project.description}
        >
          <div className={styles.tags} aria-label="Technology stack">
            {project.techStack.map((technology) => <span key={technology}>{technology}</span>)}
          </div>
        </PageIntro>
        <div className={styles.container}>
          <figure>
            <ResponsiveImage
              className={styles.cover}
              src={project.image}
              alt={`Illustrative cover for ${project.title}`}
              priority
              sizes="(max-width: 400px) calc(100vw - 36px), (max-width: 760px) calc(100vw - 44px), (max-width: 1100px) calc(100vw - 64px), (max-width: 1416px) calc(100vw - 96px), (min-width: 1600px) 1368px, 1320px"
            />
            <figcaption className={styles.caption}>
              Illustrative cover · {project.sample ? 'Concept study.' : 'Frontend contribution to the Fittra ecosystem.'}
            </figcaption>
          </figure>
          <section className={styles.detailGrid} aria-labelledby="project-overview">
            <aside className={styles.detailAside}>
              <p className={styles.eyebrow}>AT A GLANCE</p>
              <dl>
                <dt>Focus</dt><dd>{project.category}</dd>
                <dt>Project type</dt><dd>{project.sample ? 'Independent concept study' : 'Frontend development contribution'}</dd>
                <dt>Tools & technologies</dt>
                <dd className={styles.tags}>{project.techStack.map((technology) => <span key={technology}>{technology}</span>)}</dd>
              </dl>
              {project.liveLink && (
                <a className={styles.backLink} href={project.liveLink} target="_blank" rel="noreferrer">Visit the live site ↗</a>
              )}
              {project.githubLink && (
                <a className={styles.backLink} href={project.githubLink} target="_blank" rel="noreferrer">Explore the source ↗</a>
              )}
            </aside>
            <article className={`${styles.detailArticle} ${styles.prose}`}>
              <p className={styles.eyebrow}>{project.sample ? 'THE EXPLORATION' : 'THE CONTRIBUTION'}</p>
              <h2 id="project-overview">{project.sample ? 'A possibility worth exploring.' : 'Connecting the learning experience.'}</h2>
              <p>{project.overview}</p>
              <h3>{project.sample ? 'The proposed experience' : 'Where I contributed'}</h3>
              <ul className={styles.featureList}>
                {project.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <p className={styles.sectionNote}>
                {project.sample
                  ? 'This study explores a proposed product experience and the technical approach behind it.'
                  : 'My role centers on the frontend, state management, and integrations described here within the wider Fittra product ecosystem.'}
              </p>
              <ActionLink href="/#contact">Have a similar project in mind?</ActionLink>
            </article>
          </section>
          <Link className={styles.nextProject} href={`/project/${nextProject.slug}/`}>
            <div>
              <p className={styles.eyebrow}>NEXT {nextProject.sample ? 'CONCEPT STUDY' : 'PROJECT'}</p>
              <h2>{nextProject.title}</h2>
              <p>{nextProject.description}</p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <ContactSection />
      </main>
    </SylvaShell>
  );
}
