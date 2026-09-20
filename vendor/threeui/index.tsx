"use client";

import { LandingPageFrame, type LandingPageProps } from "./LandingPageFrame";
import {
  splitTypographyProps,
  usePageTypography,
  type PageTypographyProps,
} from "./pageTypography";
import { SYLVA_TYPOGRAPHY } from "./pageRecipes";

export function SublevelStudioLandingPage(props: LandingPageProps) {
  return <LandingPageFrame {...props} title="Ahmed Esmail — Full-Stack & Frontend Engineer" sourceUrl="/landing-pages/sublevel-studio.html" />;
}

// The selected Living Green branch of the registered SylvaHero. Other catalog
// variants require separate scene transformations and are not bundled here.
export const SYLVA_HERO_VARIANTS = ["living-green"] as const;
export type SylvaHeroVariant = (typeof SYLVA_HERO_VARIANTS)[number];
export type SylvaHeroProps = LandingPageProps & PageTypographyProps & { variant?: SylvaHeroVariant };

const SYLVA_HERO_BASE_URL = "/landing-pages/inner-green-3d.html";

export function SylvaHero({ variant = "living-green", ...props }: SylvaHeroProps) {
  const safeVariant = SYLVA_HERO_VARIANTS.includes(variant) ? variant : "living-green";
  const [type, frame] = splitTypographyProps(props);
  const customization = usePageTypography(SYLVA_TYPOGRAPHY, type);

  return (
    <LandingPageFrame
      {...frame}
      key={safeVariant}
      customization={customization}
      title="Ahmed Esmail — Full-Stack & Frontend Engineer"
      sourceUrl={SYLVA_HERO_BASE_URL}
    />
  );
}
