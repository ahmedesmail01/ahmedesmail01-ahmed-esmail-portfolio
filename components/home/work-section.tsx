import { Reveal } from "@/components/motion";
import { VideoProjectCard } from "@/components/video-project-card";
import { projects } from "@/lib/content";

export function WorkSection() {
  return (
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
  );
}
