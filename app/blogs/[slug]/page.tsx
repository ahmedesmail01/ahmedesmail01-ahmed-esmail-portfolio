import { ResponsiveImage } from '@/components/responsive-image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { posts } from '@/lib/content';
import {
  SylvaShell,
  PageIntro,
  JournalCard,
  ContactSection,
  SectionHeading,
} from '@/components/sylva/site';
import styles from '@/components/sylva/sylva.module.css';

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === slug);
  return { title: post?.title ?? 'Article not found', description: post?.intro };
}

function sectionId(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === slug);
  if (!post) notFound();

  const relatedPosts = posts.filter((item) => item.slug !== post.slug);

  return (
    <SylvaShell active="journal">
      <main id="main-content">
        <article>
          <div className={styles.container}>
            <Link className={styles.backLink} href="/blogs/">← Back to the journal</Link>
          </div>
          <PageIntro
            eyebrow={`${post.category} / ${post.read}`}
            title={post.title}
            description={post.intro}
          >
            <p className={styles.eyebrow}>BY AHMED ESMAIL / ENGINEERING JOURNAL</p>
          </PageIntro>
          <div className={styles.container}>
            <figure>
              <ResponsiveImage
                className={styles.cover}
                src={post.image}
                alt=""
                priority
                sizes="(max-width: 400px) calc(100vw - 36px), (max-width: 760px) calc(100vw - 44px), (max-width: 1100px) calc(100vw - 64px), (max-width: 1416px) calc(100vw - 96px), (min-width: 1600px) 1368px, 1320px"
              />
              <figcaption className={styles.caption}>An illustrative image from the portfolio.</figcaption>
            </figure>
            <div className={styles.articleLayout}>
              <aside className={styles.articleToc} aria-label="In this article">
                <p className={styles.eyebrow}>IN THIS NOTE</p>
                <nav aria-label="Article sections">
                  <ol>
                    {post.sections.map(([heading]) => (
                      <li key={heading}><a href={`#${sectionId(heading)}`}>{heading}</a></li>
                    ))}
                  </ol>
                </nav>
                <p className={styles.caption}>{post.read} · Ahmed Esmail</p>
              </aside>
              <div className={`${styles.articleBody} ${styles.prose}`}>
                {post.sections.map(([heading, text], index) => (
                  <section id={sectionId(heading)} key={heading}>
                    <p className={styles.eyebrow}>{String(index + 1).padStart(2, '0')}</p>
                    <h2>{heading}</h2>
                    <p>{text}</p>
                  </section>
                ))}
                <p className={styles.sectionNote}>
                  A note by Ahmed Esmail, full-stack engineer working across frontend experiences,
                  connected systems, and deployment.
                </p>
              </div>
            </div>
          </div>
        </article>
        <section className={`${styles.container} ${styles.section}`} aria-label="More from the journal">
          <SectionHeading eyebrow="KEEP EXPLORING" title="Another thought to take with you." />
          <div className={styles.journalGrid}>
            {relatedPosts.map((related, index) => (
              <JournalCard key={related.slug} post={related} index={index} />
            ))}
          </div>
        </section>
        <ContactSection />
      </main>
    </SylvaShell>
  );
}
