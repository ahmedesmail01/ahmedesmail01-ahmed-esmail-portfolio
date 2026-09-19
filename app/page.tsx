import { SublevelStudioLandingPage } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import styles from "@/components/home/sublevel-home-page.module.css";

export default function Home() {
  return (
    <main className={`shader-frame ${styles.frame}`}>
      <SublevelStudioLandingPage />
    </main>
  );
}
