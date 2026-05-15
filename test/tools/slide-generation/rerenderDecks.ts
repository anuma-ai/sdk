/**
 * Re-render every existing slides.jsx in .output/ to refresh its index.html
 * with the latest renderer (e.g. after a CSS / print-stylesheet change).
 * Skips the design-system catalog dump — that has its own renderer.
 *
 *   pnpm exec tsx test/tools/slide-generation/rerenderDecks.ts
 */

import fs from "node:fs";
import path from "node:path";

import { parseJsx } from "../../../src/tools/slides/jsx.js";
import { renderDeckToHtml } from "./renderHtml.js";

const ROOT = path.resolve(__dirname, ".output");

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip design-system — has its own multi-slide-system renderer.
      if (entry.name === "design-system") continue;
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name === "slides.jsx") {
      out.push(full);
    }
  }
  return out;
}

let rerendered = 0;
let skipped = 0;
for (const jsxPath of walk(ROOT)) {
  const dir = path.dirname(jsxPath);
  const testName = path.relative(ROOT, dir);
  try {
    const jsx = fs.readFileSync(jsxPath, "utf-8");
    const deck = parseJsx(jsx);
    const slideCount = deck.children.filter(
      (c) => typeof c !== "string" && c.tag === "Slide"
    ).length;
    if (slideCount === 0) {
      skipped++;
      console.log(`  skip ${testName} (empty deck)`);
      continue;
    }
    const html = renderDeckToHtml(deck, testName);
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
    rerendered++;
    console.log(`  ok   ${testName} (${slideCount} slides)`);
  } catch (err) {
    skipped++;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  skip ${testName} (${msg})`);
  }
}
console.log(`\nRe-rendered ${rerendered} deck(s); skipped ${skipped}.`);
