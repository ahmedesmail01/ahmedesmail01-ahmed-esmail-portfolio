"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import styles from "./navigation.module.css";

const links = [
  { href: "/project/", label: "Work", key: "work" },
  { href: "/services/", label: "Services", key: "services" },
  { href: "/#about", label: "About", key: "about" },
  { href: "/blogs/", label: "Journal", key: "journal" },
] as const;

export function SiteNavigation({
  active,
}: {
  active?: "work" | "services" | "journal";
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className={styles.root}>
      <nav className={styles.navigation} aria-label="Main navigation">
        <Link href="/" className={styles.brand} aria-label="Ahmed Esmail — home" onClick={() => setOpen(false)}>
          <span className={styles.monogram} aria-hidden="true">AE</span>
          <span>Ahmed Esmail<span className={styles.brandNote}>Digital products, thoughtfully built.</span></span>
        </Link>
        <div className={styles.desktopLinks}>
          {links.map((link) => (
            <Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>
        <Link href="/#contact" className={styles.contact}>
          Let’s talk <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
        <button
          ref={toggleRef}
          className={styles.toggle}
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
        <div id={menuId} className={styles.mobileLinks} hidden={!open}>
          {links.map((link) => (
            <Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined} onClick={() => setOpen(false)}>
              {link.label}<ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
          <Link href="/#contact" onClick={() => setOpen(false)}>
            Let’s talk<ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
