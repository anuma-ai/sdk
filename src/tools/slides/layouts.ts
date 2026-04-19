/**
 * Catalog of slide layout recipes used by `buildSlideSystemPrompt()` in
 * `slides.ts`. Each entry is a key (the layout name shown to the LLM) mapped
 * to the block of prose/JSON the prompt embeds for that layout.
 *
 * Moved out of the prompt template to give layouts a single source of truth
 * that's easy to import, edit, or extend. The strings below are concatenated
 * back into the prompt at build time — the LLM sees the same content it used
 * to. Runtime behavior, element schema, and storage format are unchanged.
 */

export const LAYOUT_TEMPLATES: Record<string, string> = {
  "COVER (centered)": `  title: { kind: "text", x: 7.5, y: 30, w: 85, h: 20, fontSize: 4.5, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "center" }
  subtitle: { kind: "text", x: 19, y: 55, w: 62, h: 8, fontSize: 2.3, fontRole: "heading", fontWeight: 500, color: "textSecondary", align: "center" }`,

  "COVER (left, with accent bar)": `  bar: { kind: "shape", shape: "rect", x: 6, y: 26, w: 5, h: 0.6, fill: "accent", cornerRadius: 0.2 }
  title: { kind: "text", x: 6, y: 30, w: 88, h: 24, fontSize: 4.5, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "left" }
  subtitle: { kind: "text", x: 6, y: 56, w: 88, h: 9, fontSize: 2.3, fontRole: "heading", fontWeight: 500, color: "textSecondary", align: "left" }`,

  "COVER (bottom — huge title at bottom, metadata top)": `  meta: { kind: "text", x: 6, y: 7, w: 30, h: 4, fontSize: 1.4, fontRole: "heading", fontWeight: 500, color: "textMuted", align: "left", textTransform: "uppercase" }
  title: { kind: "text", x: 6, y: 68, w: 88, h: 26, fontSize: 6.5, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "left" }`,

  "SECTION (dark chapter break — rhythm marker between parts of a multi-part deck)": `  Set slide.background to a dark hex (e.g. "#1F2A22", "#1a1b1e") so this slide reads as a tonal shift from content slides.
  eyebrow: { kind: "text", x: 6, y: 55, w: 40, h: 3.5, text: "CHAPTER TWO", fontSize: 1.4, fontRole: "body", fontWeight: 500, color: "accent", fontFamily: "JetBrains Mono", letterSpacing: 0.16, textTransform: "uppercase" }
  title: { kind: "text", x: 6, y: 61, w: 88, h: 26, text: "Timing is\\nhalf the game.", fontSize: 7.5, fontRole: "heading", fontWeight: 400, color: "#EDE6D8", fontStyle: "italic", align: "left", lineHeight: 1.02 }
  subtitle: { kind: "text", x: 6, y: 89, w: 82, h: 7, fontSize: 1.8, fontRole: "body", fontWeight: 400, color: "#B8BEB3", align: "left", lineHeight: 1.3 }`,

  "TEXT (prose)": `  heading: { kind: "text", x: 6, y: 10, w: 88, h: 10, fontSize: 3, fontRole: "heading", fontWeight: 600, color: "textPrimary", align: "left" }
  body: { kind: "text", x: 6, y: 23, w: 66, h: 65, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", align: "left", lineHeight: 1.8 }`,

  "TEXT (bullets)": `  heading: { kind: "text", x: 6, y: 9, w: 88, h: 10, fontSize: 3, fontRole: "heading", fontWeight: 600, color: "accent", align: "left" }
  bullets: { kind: "text", x: 6, y: 22, w: 88, h: 68, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", align: "left", lineHeight: 1.75 }
  (Use "• " prefix for each bullet line)`,

  "TEXT (two-column — heading left, content right)": `  heading: { kind: "text", x: 6, y: 9, w: 33, h: 82, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent", align: "left", textTransform: "uppercase" }
  body: { kind: "text", x: 43, y: 9, w: 51, h: 82, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", align: "left", lineHeight: 1.7 }`,

  "STATS (hairline cells — editorial grid, no filled cards)": `  Header: use SHARED HEADER PATTERN above (y 9–26).
  topRule: { kind: "shape", shape: "line", x: 6, y: 30, w: 88, h: 0, stroke: "border", strokeWidth: 1 }
  For each cell (i=0,1,2):
    eyebrow: { kind: "text", x: 7+30*i, y: 34, w: 27, h: 3.5, text: "01 · Revenue", fontSize: 1.3, fontRole: "body", fontWeight: 500, color: "textMuted", fontFamily: "JetBrains Mono", letterSpacing: 0.14, textTransform: "uppercase" }
    value: { kind: "text", x: 7+30*i, y: 41, w: 27, h: 12, text: "142%", fontSize: 5.5, fontRole: "heading", fontWeight: 400, color: "accent", align: "left", lineHeight: 1.0 }
    body: { kind: "text", x: 7+30*i, y: 57, w: 27, h: 20, text: "Year-over-year growth, Q4.", fontSize: 1.5, fontRole: "body", fontWeight: 400, color: "textSecondary", lineHeight: 1.4 }
  Vertical dividers between cells (use narrow rects, not line shapes): for i=1,2 add
    { kind: "shape", shape: "rect", x: 6+30*i, y: 31, w: 0.1, h: 48, fill: "border" }
  bottomRule: { kind: "shape", shape: "line", x: 6, y: 80, w: 88, h: 0, stroke: "border", strokeWidth: 1 }`,

  "STATS (inline — border-left accent)": `  For each stat: vertical accent bar (rect w=0.3, h=11, fill="accent") + value + label stacked`,

  "STATS (large — featured number)": `  value: { kind: "text", x: 7.5, y: 28, w: 85, h: 22, fontSize: 7.5, fontRole: "heading", fontWeight: 700, color: "accent", align: "center" }
  label: { kind: "text", x: 15, y: 52, w: 70, h: 8, fontSize: 2.1, fontRole: "heading", fontWeight: 400, color: "textMuted", align: "center" }
  body: { kind: "text", x: 15, y: 63, w: 70, h: 12, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textMuted", align: "center", lineHeight: 1.5 }`,

  "LIST (hairline entries — editorial field guide, 3 cols × 2 rows)": `  Header: use SHARED HEADER PATTERN above.
  topRule: { kind: "shape", shape: "line", x: 6, y: 30, w: 88, h: 0, stroke: "border", strokeWidth: 1 }
  For each entry at grid position (row r ∈ 0..1, col c ∈ 0..2):
    eyebrow: { kind: "text", x: 7+30*c, y: 33+r*24, w: 27, h: 3.5, text: "SUCKING · SOFT-BODIED", fontSize: 1.3, fontRole: "body", fontWeight: 500, color: "textMuted", fontFamily: "JetBrains Mono", letterSpacing: 0.14, textTransform: "uppercase" }
    title: { kind: "text", x: 7+30*c, y: 37+r*24, w: 27, h: 7, text: "Aphids", fontSize: 3.8, fontRole: "heading", fontWeight: 400, color: "textPrimary", align: "left", lineHeight: 1.0 }
    body: { kind: "text", x: 7+30*c, y: 46+r*24, w: 27, h: 9, text: "Clusters on new growth. Sticky residue.", fontSize: 1.5, fontRole: "body", fontWeight: 400, color: "textSecondary", lineHeight: 1.35 }
  Vertical dividers between columns (c=1,2): { kind: "shape", shape: "rect", x: 6+30*c, y: 31, w: 0.1, h: 48, fill: "border" }
  Horizontal divider between rows: { kind: "shape", shape: "line", x: 6, y: 56, w: 88, h: 0, stroke: "border", strokeWidth: 1 }
  bottomRule: { kind: "shape", shape: "line", x: 6, y: 80, w: 88, h: 0, stroke: "border", strokeWidth: 1 }`,

  "LIST (minimal — sidebar heading, stacked items with dividers)": `  heading: { kind: "text", x: 6, y: 9, w: 29, h: 82, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent", textTransform: "uppercase" }
  Items in right column with line dividers (shape "line" with stroke="border")`,

  "QUOTE (large, centered)": `  quote: { kind: "text", x: 7.5, y: 26, w: 85, h: 37, fontSize: 3.3, fontRole: "heading", fontWeight: 400, color: "textPrimary", align: "center", fontStyle: "italic", lineHeight: 1.4 }
  attribution: { kind: "text", x: 20, y: 69, w: 60, h: 5, fontSize: 1.5, fontRole: "body", fontWeight: 500, color: "textMuted", align: "center", textTransform: "uppercase" }`,

  "QUOTE (offset — left-aligned with accent bar)": `  bar: { kind: "shape", shape: "rect", x: 7.5, y: 28, w: 0.3, h: 33, fill: "accent" }
  quote: { kind: "text", x: 10, y: 28, w: 73, h: 33, fontSize: 2.6, fontRole: "heading", fontWeight: 400, color: "textPrimary", align: "left", lineHeight: 1.55 }
  attribution: { kind: "text", x: 10, y: 65, w: 73, h: 5, fontSize: 1.5, fontRole: "body", fontWeight: 500, color: "textMuted", align: "left", textTransform: "uppercase" }`,

  "TIMELINE (numbered, vertical)": `  heading: { kind: "text", x: 6, y: 7, w: 88, h: 8, fontSize: 2.5, fontRole: "heading", fontWeight: 600, color: "textPrimary" }
  For each step: number text (fontSize=1.9, fontWeight=700, color="accent") + title + body, with line dividers`,

  "TIMELINE (horizontal axis)": `  heading: { kind: "text", x: 6, y: 7, w: 88, h: 10, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent" }
  axis: { kind: "shape", shape: "line", x: 6, y: 40, w: 88, h: 0, stroke: "border", strokeWidth: 2 }
  For each event: vertical tick line + title below + body below title`,

  "HERO (split — text left, image right)": `  image: { kind: "image", x: 50, y: 0, w: 50, h: 100, src: "..." }
  heading: { kind: "text", x: 6, y: 9, w: 40, h: 19, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent", textTransform: "uppercase" }
  body: { kind: "text", x: 6, y: 30, w: 40, h: 37, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", lineHeight: 1.7 }`,

  "HERO (overlay — full image with gradient + text at bottom)": `  image: { kind: "image", x: 0, y: 0, w: 100, h: 100, src: "..." }
  gradient: { kind: "shape", shape: "rect", x: 0, y: 40, w: 100, h: 60, fill: "rgba(0,0,0,0.7)" }
  heading: { kind: "text", x: 6, y: 67, w: 88, h: 15, fontSize: 4.2, fontRole: "heading", fontWeight: 700, color: "#ffffff" }
  body: { kind: "text", x: 6, y: 83, w: 88, h: 9, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "rgba(255,255,255,0.88)" }`,

  TABLE: `  heading + header row (bold text elements) + data rows (regular text) + line dividers between rows`,

  "FOCUS (metric — huge centered number)": `  Same as STATS large.`,

  "FOCUS (accent — centered statement with underline)": `  title: { kind: "text", x: 7.5, y: 26, w: 85, h: 22, fontSize: 5.2, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "center" }
  underline: { kind: "shape", shape: "rect", x: 47, y: 50, w: 6, h: 0.6, fill: "accent", cornerRadius: 0.2 }
  subtitle: { kind: "text", x: 10, y: 54, w: 80, h: 9, fontSize: 3, fontRole: "heading", fontWeight: 500, color: "textSecondary", align: "center" }`,
};
