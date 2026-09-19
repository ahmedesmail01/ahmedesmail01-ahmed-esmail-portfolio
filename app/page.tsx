import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDown,
  Code2,
  Layers,
  Terminal,
  Globe,
} from "lucide-react";
import { Header, Footer } from "@/components/site-shell";
import { Reveal } from "@/components/motion";
import { GenerativeArtScene } from "@/components/ui/anomalous-matter-hero";
import { VideoProjectCard } from "@/components/video-project-card";
import { ContactForm } from "@/components/contact-form";
import { projects, skills, posts, profile } from "@/lib/content";
export default function Home() {
  return (
    <>
      <Header />
      <main>
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
        <div className="tech-strip">
          <div>
            REACT <span>✳</span> NEXT.JS <span>✳</span> TYPESCRIPT{" "}
            <span>✳</span> NESTJS <span>✳</span> POSTGRESQL <span>✳</span>{" "}
            DOCKER <span>✳</span> REACT <span>✳</span> NEXT.JS <span>✳</span>
          </div>
        </div>
        <section id="work" className="wrap work-section">
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / SELECTED WORK</p>
                <h2>
                  Less talk.
                  <br />
                  <span className="serif">More building.</span>
                </h2>
              </div>
              <p>
                A closer look at the interfaces,
                <br />
                systems, and details behind the work.
              </p>
            </div>
          </Reveal>
          <div className="project-grid">
            {projects.map((project, i) => (
              <Reveal key={project.slug} className={i % 2 ? "offset-card" : ""}>
                <VideoProjectCard {...project} />
              </Reveal>
            ))}
          </div>
          <p className="section-note">
            Concept covers shown. KeyBuilds, Sky Events, and Job Elite are
            sample case studies; walkthroughs will be added soon.
          </p>
        </section>
        <section className="services-teaser wrap">
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 / WHAT I CAN HELP WITH</p>
                <h2>
                  Your next big thing.
                  <br />
                  <span className="serif">Built right.</span>
                </h2>
              </div>
              <Link className="text-link" href="/services">
                Explore all services <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="service-summary">
              {[
                {
                  icon: Code2,
                  title: "Web experiences",
                  text: "Fast, expressive websites and storefronts that turn visitors into customers.",
                },
                {
                  icon: Layers,
                  title: "Business platforms",
                  text: "LMS, CRM, portals, and focused ERP modules built around your team.",
                },
                {
                  icon: Terminal,
                  title: "Behind the interface",
                  text: "Reliable APIs, payments, integrations, and repeatable deployments.",
                },
              ].map(({ icon: Icon, title, text }, i) => (
                <Link
                  href="/services"
                  key={title}
                  className="service-summary-card"
                >
                  <div>
                    <Icon size={28} />
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <ArrowUpRight size={22} />
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
        <section id="about" className="about-section wrap">
          <div className="about-intro">
            <p className="eyebrow">03 / THE PERSON BEHIND THE PIXELS</p>
            <Reveal>
              <h2>
                A designer's eye.
                <br />
                <span className="serif">An engineer's mind.</span>
              </h2>
              <p>
                I'm Ahmed, a software engineer based in Cairo. I connect the
                details people see with the systems they rely on — from a smooth
                checkout to the infrastructure behind an entire platform.
              </p>
              <p>
                My work spans real estate, e-learning, commerce, healthcare, and
                enterprise workflows. I care about making complex products feel
                simple.
              </p>
              <div className="experience-numbers">
                <div>
                  <strong>
                    4<span>+</span>
                  </strong>
                  <p>Years in frontend</p>
                </div>
                <div>
                  <strong>
                    2<span>+</span>
                  </strong>
                  <p>Years in full-stack</p>
                </div>
                <div>
                  <strong>E2E</strong>
                  <p>From idea to release</p>
                </div>
              </div>
            </Reveal>
          </div>
          <div className="timeline">
            <p className="eyebrow">THE JOURNEY SO FAR</p>
            {[
              {
                company: "Roma MPH",
                role: "Full Stack Developer / Software Engineer",
                date: "FEB 2025 — PRESENT",
                text: "Production real-estate platforms, NestJS APIs, PostgreSQL data models, and Docker-powered delivery.",
              },
              {
                company: "Manage the Now LLC",
                role: "Frontend Developer / Software Engineer",
                date: "JUL 2024 — FEB 2025",
                text: "Learning, streaming, clinic and event platforms. Payment integrations, accessible forms, and Next.js optimization.",
              },
              {
                company: "AZM Squad",
                role: "ServiceNow Developer Intern",
                date: "2025",
                text: "Shipping requests, approval workflows and role-based logistics tracking on ServiceNow.",
              },
            ].map((x) => (
              <Reveal key={x.company}>
                <article className="timeline-item">
                  <p className="eyebrow">{x.date}</p>
                  <h3>{x.company}</h3>
                  <h4>{x.role}</h4>
                  <p>{x.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
        <section className="skills-section wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">04 / MY TOOLKIT</p>
              <h2>
                The right tools.
                <br />
                <span className="serif">For the right problem.</span>
              </h2>
            </div>
            <p>
              Frontend finesse.
              <br />
              Backend depth. Production thinking.
            </p>
          </div>
          <div className="skills-grid">
            {skills.map((group, i) => (
              <div key={group.title}>
                <p className="eyebrow">0{i + 1}</p>
                <h3>{group.title}</h3>
                <div className="tags">
                  {group.items.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="journal-section wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">05 / FIELD NOTES</p>
              <h2>
                Thinking <span className="serif">out loud.</span>
              </h2>
            </div>
            <Link className="text-link" href="/blogs">
              Read the journal <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="journal-grid">
            {posts.slice(0, 2).map((post) => (
              <Link
                className="journal-card"
                key={post.slug}
                href={`/blogs/${post.slug}`}
              >
                <img
                  src={post.image}
                  width="800"
                  height="450"
                  loading="lazy"
                  alt=""
                />
                <div>
                  <p className="eyebrow">
                    {post.category} · {post.read}
                  </p>
                  <h3>
                    {post.title}
                    <ArrowUpRight size={22} />
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section id="contact" className="contact-section wrap">
          <div className="contact-title">
            <p className="eyebrow">06 / LET'S MAKE SOMETHING MATTER</p>
            <h2>
              Have a good idea?
              <br />
              <span className="serif">Let's build it.</span>
              <span className="lime">↗</span>
            </h2>
            <a href={`mailto:${profile.email}`} className="email-link">
              {profile.email}
            </a>
          </div>
          <ContactForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
