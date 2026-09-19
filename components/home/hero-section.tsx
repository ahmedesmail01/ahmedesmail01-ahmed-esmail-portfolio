import Link from "next/link";
import { ArrowUpRight, ArrowDown, Globe } from "lucide-react";
import { GenerativeArtScene } from "@/components/ui/anomalous-matter-hero";

export function HeroSection() {
  return (
    <section className="hero wrap">
      <div className="hero-topline">
        <p className="eyebrow">
          INDEPENDENT ENGINEER & CREATIVE PROBLEM SOLVER
        </p>
        <span className="location">
          <Globe size={13} /> Cairo, Egypt · Working worldwide
        </span>
      </div>
      <div className="hero-layout">
        <div className="hero-copy">
          <p className="hero-intro">Hey, I'm Ahmed Esmail.</p>
          <h1>
            <span className="hero-word">Good ideas.</span>
            <br />
            <span className="serif hero-word">Exceptional</span>
            <br />
            <span className="hero-word">
              digital things<span className="lime">.</span>
            </span>
          </h1>
          <p className="hero-role">Full-Stack & Frontend Engineer</p>
          <p className="hero-description">
            4+ years building production web applications, enterprise
            platforms, and scalable backends. Equal parts thoughtful design
            and thoughtful code.
          </p>
          <div className="hero-actions">
            <Link className="pill" href="#work">
              View Case Studies <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="#contact">
              Hire Me <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <GenerativeArtScene />
      </div>
      <div className="hero-foot">
        <span>
          <span className="small-star">✳</span> GREAT EXPERIENCES ARE BUILT,
          NOT BORN.
        </span>
        <a href="#work">
          SCROLL TO EXPLORE <ArrowDown size={15} />
        </a>
      </div>
    </section>
  );
}
