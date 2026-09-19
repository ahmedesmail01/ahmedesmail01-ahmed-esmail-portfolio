"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#090d19]" aria-hidden="true" />,
});

export function SplineScene({
  scene,
  className,
  active = true,
}: {
  scene: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <div className={cn("h-full w-full", className)}>
      {active && <Spline scene={scene} className="h-full w-full" />}
    </div>
  );
}
