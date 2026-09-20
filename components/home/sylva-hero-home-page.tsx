import { SylvaHero } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import styles from "@/components/home/sylva-home-page.module.css";

export default function SylvaHeroHomePage() {
  return (
    <main className={`shader-frame ${styles.frame}`}>
      <SylvaHero
        variant="living-green"
        headingFont="lexend"
        bodyFont="lexend"
        headingWeight="300"
        bodyWeight="300"
        primaryColor="#ffffff"
        headingSize={63}
        bodySize={16.5}
        headingLetterSpacing={-0.006}
      />
    </main>
  );
}
