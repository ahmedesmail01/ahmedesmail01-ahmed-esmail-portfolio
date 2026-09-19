"use client";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduced ? {} : { opacity: [0.65, 1], y: [22, 0] }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65 }}
    >
      {children}
    </motion.div>
  );
}
export function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let revert: (() => void) | undefined;
    let active = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (!active) return;
        gsap.registerPlugin(ScrollTrigger);
        const context = gsap.context(() => {
          gsap.to(ref.current, {
            y: 70,
            rotation: 8,
            ease: "none",
            scrollTrigger: {
              trigger: ".hero",
              start: "top top",
              end: "bottom top",
              scrub: 1,
            },
          });
          gsap.fromTo(
            ".hero .hero-word",
            { y: 35, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              stagger: 0.12,
              ease: "power3.out",
            },
          );
        });
        revert = () => context.revert();
      },
    );
    return () => {
      active = false;
      revert?.();
    };
  }, []);
  return (
    <div className="hero-art" ref={ref}>
      <img
        src="/images/hero.webp"
        alt="Iridescent sculptural form with violet, blue and green reflections"
        width="800"
        height="800"
        fetchPriority="high"
      />
      <div className="art-note">
        <span>CREATIVE THINKING</span>
        <span>ENGINEERED WITH PRECISION</span>
      </div>
    </div>
  );
}
