"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { profile } from "@/lib/content";
import styles from "./contact-form.module.css";

export function ContactForm() {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  function prepareDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const subject = encodeURIComponent(`Project enquiry from ${name}`);
    const body = encodeURIComponent(`Hello Ahmed,\n\n${message}\n\n${name}\n${email}`);
    const href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
    setDraft(href);
    const emailLink = document.createElement("a");
    emailLink.href = href;
    document.body.appendChild(emailLink);
    emailLink.click();
    emailLink.remove();
  }

  return (
    <form className={styles.root} onSubmit={prepareDraft} onInput={() => setDraft(null)} aria-label="Project enquiry">
      <div className={styles.row}>
        <label htmlFor={`${id}-name`}>
          Your name
          <input id={`${id}-name`} name="name" autoComplete="name" placeholder="What should I call you?" maxLength={120} required />
        </label>
        <label htmlFor={`${id}-email`}>
          Your email
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required />
        </label>
      </div>
      <label htmlFor={`${id}-message`}>
        What would you like to build?
        <textarea id={`${id}-message`} name="message" placeholder="A little about your idea, where you are now, and the timeline you have in mind…" rows={5} maxLength={5000} required />
      </label>
      <div className={styles.bottom}>
        <p>Opens your email app.<br />Review your draft before sending.</p>
        <button type="submit">Prepare email <ArrowUpRight size={18} aria-hidden="true" /></button>
      </div>
      <div className={styles.feedback} role="status" aria-live="polite">
        {draft && (
          <p>
            Your draft is ready to review and send in your email app. If it didn’t open, <a href={draft}>open your email draft ↗</a>.
          </p>
        )}
      </div>
    </form>
  );
}
