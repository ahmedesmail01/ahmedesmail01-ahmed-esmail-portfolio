import type { Metadata } from 'next';
import { posts } from '@/lib/content';
import {
  SylvaShell,
  PageIntro,
  JournalCard,
  ContactSection,
  SectionHeading,
} from '@/components/sylva/site';
import styles from '@/components/sylva/sylva.module.css';

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Notes by Ahmed Esmail on thoughtful frontend architecture, connected products, and dependable delivery.',
};

export default function BlogsPage() {
  return (
    <SylvaShell active="journal">
      <main id="main-content">
        <PageIntro
          eyebrow="THE JOURNAL / NOTES FROM THE BUILD"
          title="Good ideas deserve room to grow."
          description="Practical notes on the decisions behind an interface: how a product fits together, how people move through it, and how it reaches production."
        />
        <section className={`${styles.container} ${styles.section}`} aria-label="Engineering notes">
          <SectionHeading
            eyebrow="ENGINEERING, IN PLAIN LANGUAGE"
            title="A few things worth sharing."
            description="Thoughts on frontend development, product journeys, and the small habits that make shipping more dependable."
          />
          <div className={styles.journalGrid}>
            {posts.map((post, index) => (
              <JournalCard key={post.slug} post={post} index={index} />
            ))}
          </div>
        </section>
        <ContactSection />
      </main>
    </SylvaShell>
  );
}
