import { ContactForm } from "@/components/contact-form";
import { profile } from "@/lib/content";

export function ContactSection() {
  return (
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
  );
}
