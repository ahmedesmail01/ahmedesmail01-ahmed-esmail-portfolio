// Applicable recipe and helpers extracted from the registered pageRecipes.ts.
import {
  GEIST,
  INSTRUMENT_SERIF,
  NEWSREADER,
  type PageFont,
  type PageTypographyRecipe,
} from "./pageTypography";

/** Trim float noise from a ratio so the emitted CSS stays readable. */
const n = (value: number) => Number(value.toFixed(3));
/** An authored unit-scaled size, kept on the page's own --u. */
const unit = (value: number) => `calc(${n(value)} * var(--u))`;

function withAlpha(hex: string, alpha: number) {
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const LEXEND: PageFont = {
  value: "lexend",
  label: "Lexend",
  stack: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/* ── Sylva ───────────────────────────────────────────────────────────────
   The world behind the copy already has four authored dressings, so the
   colour control here is the ink rather than the scene: it moves the hero
   type and the two tints the page derives from it, and leaves the moss to
   the variants. Sizes ride the page's own --u design unit. */
export const SYLVA_TYPOGRAPHY: PageTypographyRecipe = {
  headingFonts: [LEXEND, INSTRUMENT_SERIF, NEWSREADER, GEIST],
  bodyFonts: [LEXEND, GEIST, NEWSREADER, INSTRUMENT_SERIF],
  headingWeights: ["200", "300", "400", "500", "600"],
  headingWeight: "300",
  bodyWeights: ["200", "300", "400", "500"],
  bodyWeight: "300",
  primaryColor: "#ffffff",
  headingSize: [40, 63, 92],
  bodySize: [12, 16.5, 24],
  headingLetterSpacing: [-0.06, -0.006, 0.12],
  css: (type) => `
:root {
  --ink: ${type.primary};
  --ink-soft: ${withAlpha(type.primary, 0.62)};
  --ink-faint: ${withAlpha(type.primary, 0.44)};
}
body { font-family: ${type.body}; font-weight: ${type.bodyWeight}; }
.headline, .ghost {
  font-family: ${type.heading};
}
.headline {
  font-weight: ${type.headingWeight};
  font-size: ${unit(type.headingSize)};
  line-height: ${unit((type.headingSize * 65) / 63)};
  letter-spacing: ${type.headingLetterSpacing}em;
}
.lede {
  font-weight: ${type.bodyWeight};
  font-size: ${unit(type.bodySize)};
  line-height: ${unit((type.bodySize * 22) / 16.5)};
}
@media (max-width: 900px) {
  .headline {
    font-size: ${unit((type.headingSize * 62) / 63)};
    line-height: ${unit((type.headingSize * 66) / 63)};
  }
  .lede {
    font-size: ${unit((type.bodySize * 19) / 16.5)};
    line-height: ${unit((type.bodySize * 27) / 16.5)};
  }
}
`,
};

