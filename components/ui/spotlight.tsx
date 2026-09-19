import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./spotlight.module.css";

export function Spotlight({ className, fill = "white" }: { className?: string; fill?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(styles.spotlight, className)}
      style={{ "--spotlight-fill": fill } as CSSProperties}
    />
  );
}
