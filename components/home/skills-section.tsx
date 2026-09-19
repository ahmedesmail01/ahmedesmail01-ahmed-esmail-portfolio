import { skills } from "@/lib/content";

export function SkillsSection() {
  return (
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
  );
}
