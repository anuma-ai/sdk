/**
 * Dump every layout template to a single self-contained HTML file for
 * visual review. Each layout becomes one slide; navigate with arrow keys.
 *
 * Each slide has a small mono label at the top showing the layout's name
 * and description (overlaid on y=0–4 above the layout's own y=9 content
 * band), so you can see what's what while scrolling.
 *
 * Run:
 *   pnpm exec tsx test/tools/slide-generation/dumpCatalog.ts
 *
 * Opens at:
 *   test/tools/slide-generation/.output/catalog/index.html
 */

import fs from "node:fs";
import path from "node:path";

import type { Slide, SlideDeck, SlideElement } from "../../../src/tools/slides/index.js";
import { LAYOUT_TEMPLATES } from "../../../src/tools/slides/layouts.js";
import { PALETTES } from "../../../src/tools/slides/palettes.js";
import { renderDeckToHtml } from "./renderHtml.js";

const OUT_DIR = path.resolve(__dirname, ".output", "catalog");

// Use the warm editorial palette as the backdrop — hairlines, cream,
// muted contrast all work well for a catalog-style walkthrough.
const palette = PALETTES.find((p) => p.name === "warm editorial")!;

function catalogLabel(name: string, description: string): SlideElement[] {
  return [
    {
      id: "_catalog_name",
      kind: "text",
      x: 0.5,
      y: 0.5,
      w: 30,
      h: 2.5,
      text: name,
      fontSize: 1.1,
      fontRole: "body",
      fontWeight: 700,
      color: "accent",
      fontFamily: "JetBrains Mono",
      letterSpacing: 0.12,
      textTransform: "uppercase",
      align: "left",
    },
    {
      id: "_catalog_desc",
      kind: "text",
      x: 0.5,
      y: 3.2,
      w: 99,
      h: 2.2,
      text: description,
      fontSize: 0.95,
      fontRole: "body",
      fontWeight: 400,
      color: "textMuted",
      fontFamily: "JetBrains Mono",
      letterSpacing: 0.05,
      textTransform: "none",
      align: "left",
    },
  ];
}

const slides: Slide[] = LAYOUT_TEMPLATES.map((t) => ({
  id: t.name,
  elements: [...catalogLabel(t.name, t.description), ...t.elements],
}));

const deck: SlideDeck = {
  version: 2,
  theme: { fontPreset: palette.fontPreset, colors: palette.colors },
  slides,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const html = renderDeckToHtml(deck, `Layout Catalog (${LAYOUT_TEMPLATES.length} templates)`);
const outPath = path.join(OUT_DIR, "index.html");
fs.writeFileSync(outPath, html, "utf-8");
console.log(`Wrote ${LAYOUT_TEMPLATES.length} layouts to ${path.relative(process.cwd(), outPath)}`);
