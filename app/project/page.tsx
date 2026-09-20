import type { Metadata } from 'next';
import { projects } from '@/lib/content';
import {
  SylvaShell,
  PageIntro,
  ProjectCard,
  ContactSection,
} from '@/components/sylva/site';
import styles from '@/components/sylva/sylva.module.css';

export const metadata: Metadata = {
  title: 'Selected work',
  description:
    'Explore Ahmed Esmail’s frontend contribution to Fittra Training and concept studies in interactive commerce, events, and deployment.',
};

export default function ProjectsPage() {
  const orderedProjects = [...projects].sort((a, b) => Number(a.sample) - Number(b.sample));

  return (
    <SylvaShell active="work">
      <main id="main-content">
        <PageIntro
          eyebrow="SELECTED WORK / BUILT WITH INTENTION"
          title="Ideas, taking shape."
          description="From learning experiences to explorations in commerce and infrastructure. A closer look at the interfaces, integrations, and decisions behind the work."
        >
          <p className={styles.sectionNote}>
            Fittra Training features my frontend contribution. KeyBuilds, Sky Events, and Job Elite
            are concept studies, each labeled below.
          </p>
        </PageIntro>
        <section className={`${styles.container} ${styles.section}`} aria-label="Projects and concept studies">
          <div className={styles.projectGrid}>
            {orderedProjects.map((project, index) => (
              <ProjectCard key={project.slug} project={project} index={index} />
            ))}
          </div>
        </section>
        <ContactSection />
      </main>
    </SylvaShell>
  );
}
