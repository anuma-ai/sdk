/**
 * Render a SlideDeck to a self-contained HTML file for visual inspection.
 *
 * Used by `dumpFiles` to drop an `index.html` next to every `slides.json` in
 * .output/. Open it in a browser to step through the deck with arrow keys.
 * Kept test-local (not part of the SDK surface) — the goal is eyeballing
 * generated decks, not shipping a renderer.
 */

import { FONT_PRESETS, type SlideDeck, type SlideTheme } from "../../../src/tools/slides/index.js";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveColor(token: string, theme: SlideTheme): string {
  if (token.startsWith("#") || token.startsWith("rgb")) return token;
  if (!theme.colors) return "#ffffff";
  return (theme.colors as Record<string, string>)[token] ?? theme.colors.textPrimary;
}

function collectExtraFonts(deck: SlideDeck): string[] {
  const preset = FONT_PRESETS[deck.theme.fontPreset] ?? FONT_PRESETS.default!;
  const presetFonts = new Set([preset.heading, preset.body]);
  const extras = new Set<string>();
  for (const slide of deck.slides) {
    for (const el of slide.elements) {
      const family = (el as { fontFamily?: string }).fontFamily;
      if (family && !presetFonts.has(family)) extras.add(family);
    }
  }
  return [...extras];
}

// eslint-disable-next-line complexity -- renders 4 element kinds with varied CSS
function renderElement(
  el: Record<string, unknown>,
  resolve: (token: string) => string,
  cardColor: string,
  mutedColor: string
): string {
  const x = el.x as number;
  const y = el.y as number;
  const w = el.w as number;
  const h = el.h as number;
  const base = `position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;`;

  switch (el.kind) {
    case "text": {
      const fs = ((el.fontSize as number) / 100) * 960;
      const color = resolve(el.color as string);
      const weight = (el.fontWeight as number) ?? 400;
      const align = (el.align as string) ?? "left";
      const lh = (el.lineHeight as number) ?? 1.3;
      const italic = el.fontStyle === "italic" ? "font-style:italic;" : "";
      const transform = el.textTransform === "uppercase" ? "text-transform:uppercase;" : "";
      const family = el.fontFamily
        ? `font-family:'${el.fontFamily as string}',system-ui,sans-serif;`
        : "";
      return `<div style="${base}color:${color};font-size:${fs}px;font-weight:${weight};text-align:${align};line-height:${lh};overflow:hidden;${italic}${transform}${family}">${esc(el.text as string)}</div>`;
    }
    case "shape": {
      const fill = el.fill ? resolve(el.fill as string) : "transparent";
      const stroke = el.stroke
        ? `border:${el.strokeWidth ?? 1}px solid ${resolve(el.stroke as string)};`
        : "";
      const radius = el.cornerRadius ? `border-radius:${el.cornerRadius}%;` : "";
      if (el.shape === "circle")
        return `<div style="${base}background:${fill};border-radius:50%;${stroke}"></div>`;
      if (el.shape === "line")
        return `<div style="${base}border-top:${el.strokeWidth ?? 1}px solid ${el.stroke ? resolve(el.stroke as string) : fill};"></div>`;
      return `<div style="${base}background:${fill};${stroke}${radius}"></div>`;
    }
    case "image": {
      const src = el.src as string;
      const radius = el.cornerRadius ? `border-radius:${el.cornerRadius}%;` : "";
      if (src.startsWith("http") || src.startsWith("data:"))
        return `<img style="${base}object-fit:cover;${radius}" src="${esc(src)}" />`;
      return `<div style="${base}background:${cardColor};display:flex;align-items:center;justify-content:center;${radius}color:${mutedColor};font-size:12px;">${esc(src.slice(0, 40))}</div>`;
    }
    case "icon": {
      const fs = ((el.fontSize as number) / 100) * 960;
      const color = resolve(el.color as string);
      return `<div style="${base}font-family:'Material Symbols Rounded';font-size:${fs}px;color:${color};display:flex;align-items:center;justify-content:center;">${esc(el.name as string)}</div>`;
    }
    default:
      return "";
  }
}

/** Render a SlideDeck to a self-contained HTML page with arrow-key navigation. */
export function renderDeckToHtml(deck: SlideDeck, title?: string): string {
  const c = deck.theme.colors;
  const resolve = (token: string) => resolveColor(token, deck.theme);

  const preset = FONT_PRESETS[deck.theme.fontPreset] ?? FONT_PRESETS.default!;
  const extras = collectExtraFonts(deck);
  const families = [
    preset.slug,
    ...extras.map((f) => `${f.replace(/ /g, "+")}:wght@400;500;600;700`),
  ];
  const fontsUrl = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap`;

  const slidesHtml = deck.slides
    .map((s, i) => {
      const bg = s.background ? `background:${resolve(s.background)}` : "";
      const els = s.elements
        .map((el) =>
          renderElement(el as unknown as Record<string, unknown>, resolve, c.card, c.textMuted)
        )
        .join("\n");
      return `<div class="slide" data-index="${i}" style="${bg}">${els}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsUrl}" rel="stylesheet">
<title>${esc(title ?? "Presentation")}</title>
<style>
*{box-sizing:border-box;margin:0}
html,body{width:100%;height:100%;overflow:hidden;background:${c.background};color:${c.textPrimary}}
body{font-family:'${preset.body}',system-ui,-apple-system,sans-serif}
h1,h2,h3,h4{font-family:'${preset.heading}',system-ui,sans-serif}
.viewport{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
.slide{position:absolute;width:min(100vw,calc(100vh*16/9));height:min(100vh,calc(100vw*9/16));
  background:${c.slideBg};opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;transform:translateX(40px);overflow:hidden}
.slide.active{opacity:1;pointer-events:auto;transform:translateX(0)}
.slide.exit{opacity:0;transform:translateX(-40px)}
.nav{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;
  background:rgba(0,0,0,.55);backdrop-filter:blur(12px);padding:8px 16px;border-radius:999px;z-index:10}
.nav button{background:none;border:none;color:${c.textPrimary};font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1}
.nav button:hover{background:rgba(255,255,255,.12)}
.nav button:disabled{opacity:.3;cursor:default}
.nav button:disabled:hover{background:none}
.nav .counter{font-size:13px;color:${c.textMuted};min-width:48px;text-align:center;font-variant-numeric:tabular-nums}
img{display:block}
</style>
</head>
<body>
<div class="viewport">
${slidesHtml}
</div>
<div class="nav">
  <button id="prev" aria-label="Previous">\u2190</button>
  <span class="counter" id="counter">1 / ${deck.slides.length}</span>
  <button id="next" aria-label="Next">\u2192</button>
</div>
<script>
(function(){
  var slides=document.querySelectorAll('.slide');
  var total=slides.length;
  var cur=0;
  function show(idx){
    if(idx<0||idx>=total||idx===cur)return;
    slides[cur].className='slide exit';
    slides[idx].className='slide active';
    cur=idx;
    document.getElementById('counter').textContent=(cur+1)+' / '+total;
    document.getElementById('prev').disabled=cur===0;
    document.getElementById('next').disabled=cur===total-1;
  }
  slides[0].classList.add('active');
  document.getElementById('prev').disabled=true;
  if(total<=1)document.getElementById('next').disabled=true;
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft')show(cur-1);
    if(e.key==='ArrowRight')show(cur+1);
  });
  document.getElementById('prev').addEventListener('click',function(){show(cur-1)});
  document.getElementById('next').addEventListener('click',function(){show(cur+1)});
})();
</script>
</body>
</html>`;
}
