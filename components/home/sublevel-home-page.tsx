import { SublevelStudioLandingPage } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import styles from "@/components/home/sublevel-home-page.module.css";

export function SublevelHomePage() {
  return (
    <main className={`shader-frame ${styles.frame}`}>
      <SublevelStudioLandingPage />
      {/* test */}
    </main>
  );
}
