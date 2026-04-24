/**
 * Render a parsed Anuma Deck AST to a self-contained HTML file for visual
 * inspection.
 *
 * Used by `dumpFiles` to drop an `index.html` next to every `slides.jsx` in
 * .output/. Open it in a browser to step through the deck with arrow keys.
 * Kept test-local — this is for eyeballing generated decks, not a canonical
 * renderer.
 *
 * Coordinate system: container-relative pixels on a 960×540 slide canvas.
 * Slides render at natural size and scale to the viewport; children use
 * pixel `left/top/width/height` inside an absolutely-positioned parent, or
 * CSS flex when the parent opts into `layout="row" | "column"`.
 */

import { buildFontsUrl } from "../../../src/tools/slides/fonts.js";
import type { AnumaNode, AttrValue } from "../../../src/tools/slides/index.js";
import {
  FONT_PRESETS,
  SLIDE_CANVAS_HEIGHT,
  SLIDE_CANVAS_WIDTH,
  THEME_ATTRS,
  walk,
} from "../../../src/tools/slides/index.js";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ThemeColors = Record<string, string>;

function themeColors(deck: AnumaNode): ThemeColors {
  const colors: ThemeColors = {};
  for (const token of THEME_ATTRS) {
    const v = deck.attrs[token];
    if (typeof v === "string") colors[token] = v;
  }
  return colors;
}

function resolveColor(token: AttrValue | undefined, colors: ThemeColors): string {
  if (typeof token !== "string") return "#ffffff";
  if (token.startsWith("#") || token.startsWith("rgb")) return token;
  return colors[token] ?? colors.textPrimary ?? "#ffffff";
}

function collectExtraFonts(deck: AnumaNode): string[] {
  const fontPreset = typeof deck.attrs.fontPreset === "string" ? deck.attrs.fontPreset : "default";
  const preset = FONT_PRESETS[fontPreset] ?? FONT_PRESETS.default!;
  const presetFonts = new Set([preset.heading, preset.body]);
  const extras = new Set<string>();
  walk(deck, (node) => {
    const family = node.attrs.fontFamily;
    if (typeof family === "string" && !presetFonts.has(family)) extras.add(family);
  });
  return [...extras];
}

function isFlexContainer(node: AnumaNode): boolean {
  const layout = node.attrs.layout;
  return layout === "row" || layout === "column";
}

function buildContainerStyle(node: AnumaNode): string {
  const layout = node.attrs.layout;
  if (layout !== "row" && layout !== "column") return "";
  const direction = layout === "row" ? "row" : "column";
  const gap = typeof node.attrs.gap === "number" ? `gap:${node.attrs.gap}px;` : "";
  const padding = typeof node.attrs.padding === "number" ? `padding:${node.attrs.padding}px;` : "";
  const justify =
    typeof node.attrs.justify === "string"
      ? `justify-content:${mapJustify(node.attrs.justify)};`
      : "";
  const align =
    typeof node.attrs.align === "string" ? `align-items:${mapAlign(node.attrs.align)};` : "";
  return `display:flex;flex-direction:${direction};${gap}${padding}${justify}${align}`;
}

function mapJustify(v: string): string {
  if (v === "start") return "flex-start";
  if (v === "end") return "flex-end";
  if (v === "space-between") return "space-between";
  return v;
}

function mapAlign(v: string): string {
  if (v === "start") return "flex-start";
  if (v === "end") return "flex-end";
  return v;
}

function positionStyle(node: AnumaNode, parentIsFlex: boolean): string {
  if (parentIsFlex) {
    const w = typeof node.attrs.w === "number" ? `width:${node.attrs.w}px;` : "";
    const h = typeof node.attrs.h === "number" ? `height:${node.attrs.h}px;` : "";
    const grow = typeof node.attrs.grow === "number" ? `flex-grow:${node.attrs.grow};` : "";
    const shrink = typeof node.attrs.shrink === "number" ? `flex-shrink:${node.attrs.shrink};` : "";
    const alignSelf =
      typeof node.attrs.alignSelf === "string"
        ? `align-self:${mapAlign(node.attrs.alignSelf)};`
        : "";
    return `position:relative;${w}${h}${grow}${shrink}${alignSelf}`;
  }
  const x = typeof node.attrs.x === "number" ? node.attrs.x : 0;
  const y = typeof node.attrs.y === "number" ? node.attrs.y : 0;
  const w = typeof node.attrs.w === "number" ? `width:${node.attrs.w}px;` : "";
  const h = typeof node.attrs.h === "number" ? `height:${node.attrs.h}px;` : "";
  return `position:absolute;left:${x}px;top:${y}px;${w}${h}`;
}

function renderNode(node: AnumaNode, colors: ThemeColors, parentIsFlex: boolean): string {
  const resolve = (t: AttrValue | undefined) => resolveColor(t, colors);
  const base = positionStyle(node, parentIsFlex);

  switch (node.tag) {
    case "Text": {
      const fs = typeof node.attrs.fontSize === "number" ? node.attrs.fontSize : 18;
      const color = resolve(node.attrs.color);
      const weight = typeof node.attrs.fontWeight === "number" ? node.attrs.fontWeight : 400;
      const align = typeof node.attrs.align === "string" ? node.attrs.align : "left";
      const lh = typeof node.attrs.lineHeight === "number" ? node.attrs.lineHeight : 1.3;
      const italic = node.attrs.fontStyle === "italic" ? "font-style:italic;" : "";
      const transform = node.attrs.textTransform === "uppercase" ? "text-transform:uppercase;" : "";
      const letterSpacing =
        typeof node.attrs.letterSpacing === "number"
          ? `letter-spacing:${node.attrs.letterSpacing}em;`
          : "";
      const family =
        typeof node.attrs.fontFamily === "string"
          ? `font-family:'${node.attrs.fontFamily}',system-ui,sans-serif;`
          : "";
      const body = node.children.filter((c): c is string => typeof c === "string").join("");
      return `<div style="${base}color:${color};font-size:${fs}px;font-weight:${weight};text-align:${align};line-height:${lh};overflow:hidden;white-space:pre-line;${italic}${transform}${letterSpacing}${family}">${esc(body)}</div>`;
    }
    case "Rect": {
      const fill = node.attrs.fill ? resolve(node.attrs.fill) : "transparent";
      const stroke = node.attrs.stroke
        ? `border:${typeof node.attrs.strokeWidth === "number" ? node.attrs.strokeWidth : 1}px solid ${resolve(node.attrs.stroke)};`
        : "";
      const radius =
        typeof node.attrs.cornerRadius === "number"
          ? `border-radius:${node.attrs.cornerRadius}px;`
          : "";
      return `<div style="${base}background:${fill};${stroke}${radius}"></div>`;
    }
    case "Circle": {
      const fill = node.attrs.fill ? resolve(node.attrs.fill) : "transparent";
      const stroke = node.attrs.stroke
        ? `border:${typeof node.attrs.strokeWidth === "number" ? node.attrs.strokeWidth : 1}px solid ${resolve(node.attrs.stroke)};`
        : "";
      return `<div style="${base}background:${fill};border-radius:50%;${stroke}"></div>`;
    }
    case "Line": {
      const stroke = node.attrs.stroke ? resolve(node.attrs.stroke) : colors.textMuted;
      const sw = typeof node.attrs.strokeWidth === "number" ? node.attrs.strokeWidth : 1;
      return `<div style="${base}border-top:${sw}px solid ${stroke};"></div>`;
    }
    case "Image": {
      const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
      const radius =
        typeof node.attrs.cornerRadius === "number"
          ? `border-radius:${node.attrs.cornerRadius}px;`
          : "";
      if (src.startsWith("http") || src.startsWith("data:")) {
        return `<img style="${base}object-fit:cover;${radius}" src="${esc(src)}" />`;
      }
      return `<div style="${base}background:${colors.card};display:flex;align-items:center;justify-content:center;${radius}color:${colors.textMuted};font-size:12px;">${esc(src.slice(0, 40))}</div>`;
    }
    case "Icon": {
      const fs = typeof node.attrs.fontSize === "number" ? node.attrs.fontSize : 24;
      const color = resolve(node.attrs.color);
      const name = typeof node.attrs.name === "string" ? node.attrs.name : "";
      return `<div style="${base}font-family:'Material Symbols Rounded';font-size:${fs}px;color:${color};display:flex;align-items:center;justify-content:center;">${esc(name)}</div>`;
    }
    case "Group": {
      const containerStyle = buildContainerStyle(node);
      const myIsFlex = isFlexContainer(node);
      const kids = node.children
        .filter((c): c is AnumaNode => typeof c !== "string")
        .map((c) => renderNode(c, colors, myIsFlex))
        .join("\n");
      return `<div style="${base}${containerStyle}">${kids}</div>`;
    }
    default:
      return "";
  }
}

/** Render an Anuma deck to a self-contained HTML page with arrow-key navigation. */
export function renderDeckToHtml(deck: AnumaNode, title?: string): string {
  const colors = themeColors(deck);
  const bg = colors.background ?? "#000";
  const slideBg = colors.slideBg ?? "#111";
  const textPrimary = colors.textPrimary ?? "#fff";
  const textMuted = colors.textMuted ?? "#999";

  const fontPreset = typeof deck.attrs.fontPreset === "string" ? deck.attrs.fontPreset : "default";
  const preset = FONT_PRESETS[fontPreset] ?? FONT_PRESETS.default!;
  const extras = collectExtraFonts(deck);
  const fontsUrl = buildFontsUrl(
    [preset.heading, preset.body, ...extras],
    ["Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"]
  );

  const slides = deck.children.filter(
    (c): c is AnumaNode => typeof c !== "string" && c.tag === "Slide"
  );
  const slidesHtml = slides
    .map((slide, i) => {
      const slideBgOverride =
        typeof slide.attrs.background === "string"
          ? `background:${resolveColor(slide.attrs.background, colors)};`
          : "";
      const containerStyle = buildContainerStyle(slide);
      const myIsFlex = isFlexContainer(slide);
      const kids = slide.children
        .filter((c): c is AnumaNode => typeof c !== "string")
        .map((c) => renderNode(c, colors, myIsFlex))
        .join("\n");
      return `<div class="slide" data-index="${i}" style="${slideBgOverride}${containerStyle}">${kids}</div>`;
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
html,body{width:100%;height:100%;overflow:hidden;background:${bg};color:${textPrimary}}
body{font-family:'${preset.body}',system-ui,-apple-system,sans-serif}
h1,h2,h3,h4{font-family:'${preset.heading}',system-ui,sans-serif}
.viewport{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
.slide{position:absolute;width:${SLIDE_CANVAS_WIDTH}px;height:${SLIDE_CANVAS_HEIGHT}px;
  background:${slideBg};opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;transform:translateX(40px) scale(var(--scale,1));transform-origin:center center;overflow:hidden}
.slide.active{opacity:1;pointer-events:auto;transform:translateX(0) scale(var(--scale,1))}
.slide.exit{opacity:0;transform:translateX(-40px) scale(var(--scale,1))}
.nav{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;
  background:rgba(0,0,0,.55);backdrop-filter:blur(12px);padding:8px 16px;border-radius:999px;z-index:10}
.nav button{background:none;border:none;color:${textPrimary};font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1}
.nav button:hover{background:rgba(255,255,255,.12)}
.nav button:disabled{opacity:.3;cursor:default}
.nav button:disabled:hover{background:none}
.nav .counter{font-size:13px;color:${textMuted};min-width:48px;text-align:center;font-variant-numeric:tabular-nums}
img{display:block}
</style>
</head>
<body>
<div class="viewport">
${slidesHtml}
</div>
<div class="nav">
  <button id="prev" aria-label="Previous">←</button>
  <span class="counter" id="counter">1 / ${slides.length}</span>
  <button id="next" aria-label="Next">→</button>
</div>
<script>
(function(){
  var slides=document.querySelectorAll('.slide');
  var total=slides.length;
  var cur=0;
  var W=${SLIDE_CANVAS_WIDTH},H=${SLIDE_CANVAS_HEIGHT};
  function fitScale(){
    var vw=window.innerWidth,vh=window.innerHeight;
    var scale=Math.min(vw/W,vh/H);
    document.documentElement.style.setProperty('--scale',scale);
  }
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
  fitScale();
  window.addEventListener('resize',fitScale);
})();
</script>
</body>
</html>`;
}
