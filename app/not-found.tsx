import { SylvaShell, PageIntro, ActionLink } from '@/components/sylva/site';

export default function NotFound() {
  return (
    <SylvaShell>
      <main id="main-content">
        <PageIntro
          eyebrow="404 / A LITTLE OFF THE PATH"
          title="Let’s find your way back."
          description="This page may have moved, or the address might be a little different. There’s still plenty to explore."
        >
          <ActionLink href="/">Back to the portfolio</ActionLink>
          <ActionLink href="/project/" secondary>Explore the work</ActionLink>
        </PageIntro>
      </main>
    </SylvaShell>
  );
}
