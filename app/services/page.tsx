import type { Metadata } from 'next';
import { BookOpen, Code2, Gauge, Globe, Layers, ShoppingBag, Users, Workflow } from 'lucide-react';
import { services } from '@/lib/content';
import {
  SylvaShell,
  PageIntro,
  ActionLink,
  ContactSection,
  ProcessSection,
  SectionHeading,
} from '@/components/sylva/site';
import styles from '@/components/sylva/sylva.module.css';

export const metadata: Metadata = {
  title: 'Development services',
  description:
    'Websites, e-commerce, LMS, CRM, ERP modules, APIs, performance, and deployment services by Ahmed Esmail.',
};

const serviceIcons = [Globe, ShoppingBag, BookOpen, Users, Workflow, Layers, Code2, Gauge];

export default function ServicesPage() {
  return (
    <SylvaShell active="services">
      <main id="main-content">
        <PageIntro
          eyebrow="SERVICES / FROM FIRST IDEA TO WHAT’S NEXT"
          title="The right foundation for your next chapter."
          description="Thoughtful interfaces, connected systems, and a practical path to production. Development shaped around your business and the people who use it."
        >
          <ActionLink href="/#contact">Let’s discuss your project</ActionLink>
        </PageIntro>
        <section className={`${styles.container} ${styles.section}`} aria-label="Development services">
          <SectionHeading
            eyebrow="HOW I CAN HELP"
            title="Built around what you need."
            description="Start with a single landing page, a focused integration, or a custom product. We’ll agree on the scope and choose a build that makes sense for your goals."
          />
          <div className={styles.serviceGrid}>
            {services.map((service, index) => {
              const Icon = serviceIcons[index];
              return (
                <article className={styles.serviceCard} key={service.title}>
                  <div className={styles.serviceNumber}>
                    <Icon className={styles.serviceIcon} size={28} strokeWidth={1.3} aria-hidden="true" />
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <p className={styles.eyebrow}>{service.tag}</p>
                  <h2>{service.title}</h2>
                  <p>{service.description}</p>
                  <ul className={styles.featureList}>
                    {service.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <ActionLink href="/#contact" secondary>Discuss this service</ActionLink>
                </article>
              );
            })}
          </div>
          <p className={styles.sectionNote}>
            ERP work is scoped as focused modules and integrations, with specialist requirements
            agreed before development begins.
          </p>
        </section>
        <ProcessSection />
        <ContactSection />
      </main>
    </SylvaShell>
  );
}
