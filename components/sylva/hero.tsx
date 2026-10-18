"use client";

import { useCallback, useRef } from "react";
import { SylvaHero } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import "./mobile-hero.css";
import styles from "./hero.module.css";

export function SylvaHomeHero() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const connectVideo = useCallback((frame: HTMLIFrameElement) => {
    const trigger = frame.contentDocument?.querySelector<HTMLElement>(".liquid-button--play");
    if (!trigger) return;
    triggerRef.current = trigger;
    trigger.removeAttribute("data-business-route");
    trigger.setAttribute("aria-label", "Play Software Vision video");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      dialogRef.current?.showModal();
      void videoRef.current?.play().catch(() => {});
    };
  }, []);

  return (
    <>
    <section
      id="home"
      className={`shader-frame sylva-mobile-hero ${styles.frame}`}
      aria-label="Ahmed Esmail — full-stack and frontend engineer"
      tabIndex={-1}
    >
      <SylvaHero
        applyScene={connectVideo}
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
    <dialog
      ref={dialogRef}
      className={styles.videoDialog}
      aria-label="Software Vision video"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      onClose={() => {
        videoRef.current?.pause();
        if (videoRef.current) videoRef.current.currentTime = 0;
        triggerRef.current?.focus();
      }}
    >
      <div className={styles.videoPanel}>
        <button type="button" className={styles.closeVideo} aria-label="Close video" onClick={() => dialogRef.current?.close()} autoFocus>×</button>
        <video ref={videoRef} controls playsInline preload="none" poster="/videos/software-vision-poster.jpg" aria-label="Software Vision">
          <source src="/videos/software-vision.mp4" type="video/mp4" />
          Your browser does not support video. <a href="/videos/software-vision.mp4">Download the video</a>.
        </video>
      </div>
    </dialog>
    </>
  );
}
