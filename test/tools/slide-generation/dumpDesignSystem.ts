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
  AGENDA,
  BRAND_STORY_SPLIT,
  CORPORATE_MODERN,
  COVER_SPLIT_PORTRAIT,
  COVER_STATEMENT,
  EDITORIAL_WARM,
  HEADLINE_NUMBER,
  FOUNDER_QUOTE_PORTRAIT,
  MARKETING_GRID,
  MINIMAL_SWISS,
  MULTI_STAT_ASYMMETRIC,
  PEER_COMPARISON_TABLE,
  PLAYFUL_CREATIVE,
  PROBLEM_EVIDENCE,
  STAT_ROW_BOTTOM,
  SURFACE_PAIR,
  TECHNO_BOLD,
  applyAccent,
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
  COVER_STATEMENT,
  PROBLEM_EVIDENCE,
  HEADLINE_NUMBER,
  AGENDA,
  BRAND_STORY_SPLIT,
  FOUNDER_QUOTE_PORTRAIT,
  MARKETING_GRID,
  SURFACE_PAIR,
  STAT_ROW_BOTTOM,
  MULTI_STAT_ASYMMETRIC,
  PEER_COMPARISON_TABLE,
];

// LLM-style accent overrides — pass-only a `base` hex; the dark-surface
// variant is auto-derived via HSL lightening in applyAccent(). Each
// override produces a variant of the colored systems (techno-bold,
// playful-creative, minimal-swiss) — monochrome corporate-modern and
// palette-driven editorial-warm declare no accent and pass through
// unchanged.
const accentOverrides: Array<{ label: string; base: string }> = [
  { label: "green", base: "#16A34A" },
  { label: "violet", base: "#7C3AED" },
  { label: "mustard", base: "#D97706" },
];

const baseSystems: Array<{ name: string; system: DesignSystem }> = [
  { name: "editorial-warm", system: EDITORIAL_WARM },
  { name: "techno-bold", system: TECHNO_BOLD },
  { name: "corporate-modern", system: CORPORATE_MODERN },
  { name: "playful-creative", system: PLAYFUL_CREATIVE },
  { name: "minimal-swiss", system: MINIMAL_SWISS },
];

const systems: Array<{ name: string; system: DesignSystem }> = [
  ...baseSystems,
  // Variants: each colored system with each accent override applied.
  // Systems without an `accent` slot return unchanged from applyAccent
  // and are skipped here so the filter doesn't get noise.
  ...baseSystems.flatMap(({ name, system }) =>
    system.accent
      ? accentOverrides.map(({ label, base }) => ({
          name: `${name}@${label}`,
          system: applyAccent(system, { base }),
        }))
      : []
  ),
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
// skipNav: true → we'll inject our own filter-aware nav below. The shared
// renderer's default nav captures `.slide` into a static NodeList at load
// time, which makes filtering by design system impossible to retrofit.
const baseHtml = renderDeckToHtml(
  deck,
  `${compositions.length} compositions × ${systems.length} design systems`,
  { skipNav: true }
);

const systemOptions = systems
  .map((s) => `<option value="${s.name}">${s.name}</option>`)
  .join("");
const filterAndNav = `
<div id="system-filter" style="position:fixed;top:16px;left:16px;z-index:11;
  background:rgba(0,0,0,.65);backdrop-filter:blur(12px);color:#fff;
  padding:8px 12px;border-radius:999px;font-family:system-ui,sans-serif;font-size:13px;display:flex;gap:8px;align-items:center">
  <label for="system-select">design system</label>
  <select id="system-select" style="background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);
    border-radius:6px;padding:4px 8px;font-size:13px;font-family:inherit;cursor:pointer">
    <option value="__all__">all</option>
    ${systemOptions}
  </select>
</div>
<div class="nav">
  <button id="prev" aria-label="Previous">←</button>
  <span class="counter" id="counter">1 / 1</span>
  <button id="next" aria-label="Next">→</button>
</div>
<script>
(function(){
  var select=document.getElementById('system-select');
  var allSlides=Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var counter=document.getElementById('counter');
  var prev=document.getElementById('prev');
  var next=document.getElementById('next');
  var visible=allSlides.slice();
  var cur=0;
  function filterBySystem(){
    var sys=select.value;
    visible=allSlides.filter(function(s){
      if(sys==='__all__')return true;
      var id=s.getAttribute('data-slide-id')||'';
      return id.endsWith('--'+sys);
    });
    allSlides.forEach(function(s){
      s.style.display='none';
      s.classList.remove('active','exit');
    });
    visible.forEach(function(s,i){
      s.style.display='';
      if(i===0)s.classList.add('active');
    });
    cur=0;
    counter.textContent='1 / '+visible.length;
    prev.disabled=true;
    next.disabled=visible.length<=1;
  }
  function show(idx){
    if(idx<0||idx>=visible.length||idx===cur)return;
    visible[cur].classList.remove('active');
    visible[cur].classList.add('exit');
    visible[idx].classList.remove('exit');
    visible[idx].classList.add('active');
    cur=idx;
    counter.textContent=(cur+1)+' / '+visible.length;
    prev.disabled=cur===0;
    next.disabled=cur===visible.length-1;
  }
  select.addEventListener('change',filterBySystem);
  prev.addEventListener('click',function(){show(cur-1);});
  next.addEventListener('click',function(){show(cur+1);});
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft')show(cur-1);
    else if(e.key==='ArrowRight')show(cur+1);
  });
  filterBySystem();
})();
</script>
`;
const html = baseHtml.replace("</body>", filterAndNav + "</body>");
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

// Only base systems get the budget report — accent variants share budgets.
for (const composition of compositions) {
  for (const { name, system } of baseSystems) {
    reportPair(composition, name, system);
  }
}

console.log(
  `\nCompiled ${compositions.length} compositions × ${systems.length} system variants ` +
    `(${baseSystems.length} base + ${systems.length - baseSystems.length} accent overrides) ` +
    `= ${slides.length} slides → ${path.relative(process.cwd(), outPath)}`
);
