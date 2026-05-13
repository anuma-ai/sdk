/**
 * Compile the design-system proposal sketch and dump the result to HTML
 * for visual review.
 *
 * Renders every (composition × design system) pair in one deck so you can
 * arrow-key through and see how each composition looks across visual
 * identities. Validation results print to the terminal: budget per slot
 * and any default content that exceeds it.
 *
 * Wired against the PROPOSAL surface (src/tools/slides/designSystem.ts).
 * Does not touch the live tool flow.
 *
 * Run:
 *   pnpm exec tsx test/tools/slide-generation/dumpDesignSystem.ts
 *
 * Output:
 *   test/tools/slide-generation/.output/design-system/index.html
 */

import fs from "node:fs";
import path from "node:path";

import {
  COVER_SPLIT_PORTRAIT,
  EDITORIAL_WARM,
  FOUNDER_QUOTE_PORTRAIT,
  MARKETING_GRID,
  STAT_ROW_BOTTOM,
  SURFACE_PAIR,
  TECHNO_BOLD,
  compile,
  describeComposition,
  validateComposition,
  type DesignSystem,
  type LayoutComposition,
} from "../../../src/tools/slides/designSystem.js";
import { FONT_PRESETS, parseJsx } from "../../../src/tools/slides/index.js";
import { PALETTES } from "../../../src/tools/slides/palettes.js";
import { renderDeckToHtml } from "./renderHtml.js";

const OUT_DIR = path.resolve(__dirname, ".output", "design-system");

// The deck wrapper supplies one fontPreset and one palette. editorial-warm
// reads heading/body fonts from the preset; techno-bold uses literal font
// strings and literal hex colors, so it ignores the preset and palette
// entirely. That lets us put every system into one deck without conflict.
const palette = PALETTES.find((p) => p.name === "warm editorial")!;
const fontPreset = FONT_PRESETS[palette.fontPreset] ?? FONT_PRESETS.default!;

const compositions: LayoutComposition[] = [
  COVER_SPLIT_PORTRAIT,
  MARKETING_GRID,
  FOUNDER_QUOTE_PORTRAIT,
  SURFACE_PAIR,
  STAT_ROW_BOTTOM,
];

const systems: Array<{ name: string; system: DesignSystem }> = [
  { name: "editorial-warm", system: EDITORIAL_WARM },
  { name: "techno-bold", system: TECHNO_BOLD },
];

// Build one deck with every (composition × system) pair, grouped by
// composition so two adjacent slides are the same layout in different
// visual identities — easy to flip between.
const slides: string[] = [];
for (const composition of compositions) {
  for (const { name, system } of systems) {
    slides.push(compile(composition, system, fontPreset, `${composition.name}--${name}`));
  }
}

const deckAttrs = [
  `fontPreset="${palette.fontPreset}"`,
  ...Object.entries(palette.colors).map(([k, v]) => `${k}="${v}"`),
].join("\n  ");

const deckJsx = `<Anuma.Deck
  ${deckAttrs}
>
${slides.join("\n")}
</Anuma.Deck>`;

const deck = parseJsx(deckJsx);

fs.mkdirSync(OUT_DIR, { recursive: true });
const html = renderDeckToHtml(
  deck,
  `${compositions.length} compositions × ${systems.length} design systems`
);
const outPath = path.join(OUT_DIR, "index.html");
fs.writeFileSync(outPath, html, "utf-8");

// Print the LLM-facing slot-budget recipe and validation issues for each
// composition × design system pair. Option 3 from the content-overflow
// discussion — the constraints are surfaced to the prompt boundary.
function reportPair(
  composition: LayoutComposition,
  label: string,
  system: DesignSystem
): void {
  console.log(`\n══════════ ${composition.name} × ${label} ══════════`);
  console.log(describeComposition(composition, system, fontPreset));
  const issues = validateComposition(composition, system, fontPreset);
  if (issues.length === 0) {
    console.log(`\n  ✓ All default content fits.`);
  } else {
    console.log(`\n  ⚠ ${issues.length} slot(s) overflow with default content:`);
    for (const i of issues) {
      console.log(`    - ${i.id} [${i.role}]: ${i.issue}`);
      console.log(`      text: ${JSON.stringify(i.text)}`);
    }
  }
}

for (const composition of compositions) {
  for (const { name, system } of systems) {
    reportPair(composition, name, system);
  }
}

console.log(
  `\nCompiled ${compositions.length} compositions × ${systems.length} design systems = ${slides.length} slides → ${path.relative(process.cwd(), outPath)}`
);
