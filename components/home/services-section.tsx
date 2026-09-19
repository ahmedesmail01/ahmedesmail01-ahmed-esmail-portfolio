import Link from "next/link";
import { ArrowUpRight, Code2, Layers, Terminal } from "lucide-react";
import { Reveal } from "@/components/motion";

export function ServicesSection() {
  return (
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
  );
}
