"use client";

import { useEffect, useState, type RefObject } from "react";

export function useSceneVisible(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "-15% 0px -15% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}
