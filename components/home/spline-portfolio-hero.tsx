"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { useSceneVisible } from "@/components/ui/use-scene-visible";
import { profile } from "@/lib/content";
import styles from "./spline-portfolio-hero.module.css";

const scene = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

export function SplinePortfolioHero() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const visible = useSceneVisible(sceneRef);

  return (
    <section className={styles.section} aria-label="Interactive portfolio introduction">
      <Card className="!relative !flex !w-full !flex-row !gap-0 !overflow-hidden !rounded-none !border-0 !bg-[#05070e] !p-0">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
        <div className={styles.layout}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>AHMED ESMAIL / SOFTWARE ENGINEER</p>
            <h2>{profile.name}<span>.</span></h2>
            <p className={styles.role}>Full-Stack &amp; Frontend Engineer</p>
            <p className={styles.description}>
              I build expressive web experiences, dependable platforms, and the
              systems behind them. Explore the work, then let&apos;s make something matter.
            </p>
            <div className={styles.actions}>
              <Link href="#work" className={styles.primary}>View my work <ArrowUpRight size={18} /></Link>
              <Link href="#contact" className={styles.secondary}>Let&apos;s talk <ArrowUpRight size={18} /></Link>
            </div>
          </div>
          <div ref={sceneRef} className={styles.scene}>
            <SplineScene scene={scene} active={visible} className={styles.spline} />
          </div>
        </div>
      </Card>
    </section>
  );
}
