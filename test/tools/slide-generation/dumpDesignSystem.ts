/**
 * Compile the design-system proposal sketch and dump the result to HTML
 * for visual review.
 *
 * Renders the SAME composition (cover-split-portrait) through TWO design
 * systems (editorial-warm and techno-bold) as two slides in one deck.
 * The point: same layout, different visual identity, zero changes to
 * the composition. Arrow-key through to flip between them.
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
  TECHNO_BOLD,
  compile,
  describeComposition,
  validateComposition,
  type DesignSystem,
} from "../../../src/tools/slides/designSystem.js";
import { FONT_PRESETS, parseJsx } from "../../../src/tools/slides/index.js";
import { PALETTES } from "../../../src/tools/slides/palettes.js";
import { renderDeckToHtml } from "./renderHtml.js";

const OUT_DIR = path.resolve(__dirname, ".output", "design-system");

// The deck wrapper supplies one fontPreset and one palette. editorial-warm
// reads heading/body fonts from the preset; techno-bold uses literal font
// strings and literal hex colors, so it ignores the preset and palette
// entirely. That lets us put both systems in the same deck without one
// disrupting the other.
const palette = PALETTES.find((p) => p.name === "warm editorial")!;
const fontPreset = FONT_PRESETS[palette.fontPreset] ?? FONT_PRESETS.default!;

const slideEditorial = compile(
  COVER_SPLIT_PORTRAIT,
  EDITORIAL_WARM,
  fontPreset,
  "cover--editorial-warm"
);
const slideTechno = compile(
  COVER_SPLIT_PORTRAIT,
  TECHNO_BOLD,
  fontPreset,
  "cover--techno-bold"
);

const deckAttrs = [
  `fontPreset="${palette.fontPreset}"`,
  ...Object.entries(palette.colors).map(([k, v]) => `${k}="${v}"`),
].join("\n  ");

const deckJsx = `<Anuma.Deck
  ${deckAttrs}
>
${slideEditorial}
${slideTechno}
</Anuma.Deck>`;

const deck = parseJsx(deckJsx);

fs.mkdirSync(OUT_DIR, { recursive: true });
const html = renderDeckToHtml(
  deck,
  `Same composition × two design systems`
);
const outPath = path.join(OUT_DIR, "index.html");
fs.writeFileSync(outPath, html, "utf-8");

// Print the LLM-facing slot-budget recipe and any validation issues for
// each design system. This is what the model would see when asked to
// fill the composition — option 3 from the content-overflow discussion.
function reportSystem(label: string, system: DesignSystem): void {
  console.log(`\n══════════ ${label} ══════════`);
  console.log(describeComposition(COVER_SPLIT_PORTRAIT, system, fontPreset));
  const issues = validateComposition(COVER_SPLIT_PORTRAIT, system, fontPreset);
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

reportSystem("editorial-warm", EDITORIAL_WARM);
reportSystem("techno-bold", TECHNO_BOLD);

console.log(
  `\nCompiled cover-split-portrait through editorial-warm + techno-bold → ${path.relative(process.cwd(), outPath)}`
);
