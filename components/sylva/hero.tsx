import { SylvaHero } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import styles from "./hero.module.css";

export function SylvaHomeHero() {
  return (
    <section
      id="home"
      className={`shader-frame ${styles.frame}`}
      aria-label="Ahmed Esmail — full-stack and frontend engineer"
      tabIndex={-1}
    >
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
    </section>
  );
}
