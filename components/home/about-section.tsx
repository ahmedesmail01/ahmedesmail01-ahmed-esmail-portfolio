import { Reveal } from "@/components/motion";

export function AboutSection() {
  return (
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
  );
}
