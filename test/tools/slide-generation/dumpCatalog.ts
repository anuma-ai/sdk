/**
 * Dump every layout template to a single self-contained HTML file for
 * visual review. Each layout becomes one slide; navigate with arrow keys.
 *
 * Each slide has a small mono label at the top showing the layout's name
 * and description (overlaid above the layout's own content), so you can
 * see what's what while scrolling.
 *
 * Run:
 *   pnpm exec tsx test/tools/slide-generation/dumpCatalog.ts
 *
 * Opens at:
 *   test/tools/slide-generation/.output/catalog/index.html
 */

import fs from "node:fs";
import path from "node:path";

import { parseJsx } from "../../../src/tools/slides/index.js";
import { LAYOUT_TEMPLATES, renderLayoutSlideJsx } from "../../../src/tools/slides/layouts.js";
import { PALETTES } from "../../../src/tools/slides/palettes.js";
import { renderDeckToHtml } from "./renderHtml.js";

const OUT_DIR = path.resolve(__dirname, ".output", "catalog");

// Warm editorial palette as the backdrop — hairlines, cream, muted contrast
// all work well for a catalog-style walkthrough.
const palette = PALETTES.find((p) => p.name === "warm editorial")!;

function deckAttrs(): string {
  const attrs = [`fontPreset="${palette.fontPreset}"`];
  for (const [k, v] of Object.entries(palette.colors)) attrs.push(`${k}="${v}"`);
  return attrs.join("\n  ");
}

function catalogLabelJsx(name: string, description: string): string {
  // Align with the layouts' 6% (= 57.6px) left content gutter so the label
  // sits visually above whatever the layout's first element is.
  // letterSpacing is em-based in the renderer — keep it subtle.
  const safeName = name.replace(/"/g, "&quot;");
  const safeDesc = description.replace(/"/g, "&quot;");
  return [
    `<Anuma.Text id="_catalog_name" x={57.6} y={4.8} w={400} h={14} fontRole="body" style={{ fontSize: 11, fontWeight: 700, color: "accent", textAlign: "left", letterSpacing: 0.12, textTransform: "uppercase", fontFamily: "JetBrains Mono" }}>${safeName}</Anuma.Text>`,
    `<Anuma.Text id="_catalog_desc" x={57.6} y={20} w={844.8} h={16} fontRole="body" style={{ fontSize: 10, fontWeight: 400, color: "textMuted", textAlign: "left", letterSpacing: 0, fontFamily: "JetBrains Mono" }}>${safeDesc}</Anuma.Text>`,
  ].join("\n");
}

const slidesJsx = LAYOUT_TEMPLATES.map((t) => {
  const slide = renderLayoutSlideJsx(t.name, catalogLabelJsx(t.name, t.description));
  if (!slide) throw new Error(`Unexpected: layout ${t.name} not found in catalog`);
  return slide;
}).join("\n");

const deckJsx = `<Anuma.Deck
  ${deckAttrs()}
>
${slidesJsx}
</Anuma.Deck>`;

const deck = parseJsx(deckJsx);

fs.mkdirSync(OUT_DIR, { recursive: true });
const html = renderDeckToHtml(deck, `Layout Catalog (${LAYOUT_TEMPLATES.length} templates)`);
const outPath = path.join(OUT_DIR, "index.html");
fs.writeFileSync(outPath, html, "utf-8");
console.log(`Wrote ${LAYOUT_TEMPLATES.length} layouts to ${path.relative(process.cwd(), outPath)}`);
