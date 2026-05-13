/**
 * DesignSystem — proposal sketch for decoupling layout composition from
 * visual style.
 *
 * The current layouts.ts encodes three things together: where elements go
 * (composition), what each element is for (content roles), and how each
 * element looks (style — fontFamily/fontSize/color/weight). The result is
 * that every cover slide looks the same regardless of the deck's intent.
 *
 * This file proposes splitting style out into a separate "design system"
 * layer. A layout becomes a role-tagged compositional skeleton; a design
 * system maps roles → concrete styles. The same composition rendered with
 * different design systems produces visually distinct decks.
 *
 * Status: PROPOSAL. Not wired into the live tool flow. See
 * test/tools/slide-generation/dumpDesignSystem.ts for a working
 * demonstration that compiles one composition through the editorial-warm
 * system and dumps it to HTML for inspection.
 */

// ---------------------------------------------------------------------------
// Roles — what an element is, independent of how it looks
// ---------------------------------------------------------------------------

/**
 * Finite set of semantic roles every slide element can play. A layout
 * composition references roles only; the design system decides what each
 * role concretely looks like.
 */
export type ElementRole =
  | "hero" // big display heading — one LINE of the hero (regular)
  | "hero-accent" // big display heading — the italic accent line
  | "subtitle" // secondary heading directly under a hero
  | "eyebrow" // small mono uppercase label above a heading
  | "body" // running prose paragraph
  | "bullets" // multi-line bulleted body
  | "stat-value" // big featured number ("62", "95%", "+240")
  | "stat-label" // small caption under a stat
  | "quote" // pull-quote text
  | "attribution" // quote attribution ("— Mei Han")
  | "chrome-left" // top-left page chrome (brand + section)
  | "chrome-right" // top-right page chrome (page counter)
  | "footer" // bottom footer line
  | "divider" // thin hairline rule (shape role)
  | "accent-bar" // colored accent rectangle (shape role)
  | "image"; // image placeholder (image role)

// ---------------------------------------------------------------------------
// RoleStyle — the concrete styling applied to a role within a design system
// ---------------------------------------------------------------------------

/**
 * Concrete style values for one role within one design system. Values are
 * canvas-percent for sizes (resolved to px at compile time), and theme
 * tokens for colors (resolved by the renderer).
 */
export interface RoleStyle {
  /**
   * Logical font family.
   * - "heading" / "body" → resolved against the deck's FontPreset.
   * - A literal family name string ("JetBrains Mono", "Inter") is passed
   *   through verbatim. Use this for monospace where we don't want to
   *   redefine the preset.
   */
  fontFamily: "heading" | "body" | string;
  /** Font size as a percentage of canvas width. */
  fontSize: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  /** Theme color token (e.g. "textPrimary", "accent") resolved by the renderer. */
  color: string;
  textTransform?: "none" | "uppercase";
  /** Letter spacing in em units (matches the renderer's interpretation). */
  letterSpacing?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
}

/**
 * A named, self-contained visual identity. Maps every role to a concrete
 * style and declares dark-mode overrides per role. New design system =
 * one file edit, no changes to layouts.
 *
 * The italic-accent "signature move" is handled at the *composition*
 * level: a hero phrase is broken into multiple positioned elements,
 * where the emotional word uses the `hero-accent` role (italic + accent
 * color) while the surrounding lines use `hero`. The model decides where
 * to break and what to emphasize when filling the slots. This sidesteps
 * needing inline span support inside a single Text element.
 */
export interface DesignSystem {
  name: string;
  /** One-line "use this when ..." hint for the model. */
  useFor: string;
  /** The role → style map. Must cover every role used by any composition. */
  styles: Record<ElementRole, RoleStyle>;
  /**
   * Per-role style overrides applied when a composition has
   * `darkBackground: true`. Typically swaps text colors so they read on
   * dark and re-tints the accent. Roles not listed inherit base styles.
   */
  dark?: Partial<Record<ElementRole, Partial<RoleStyle>>>;
  /**
   * The slide background color used when a composition opts into dark
   * mode. Each system declares its own (e.g. warm-brown vs near-black)
   * so the composition stays design-system-agnostic.
   */
  darkBackground?: string;
  /**
   * Optional composition hints. The model can read these to bias layout
   * choices for this system (e.g. prefer asymmetric over centered).
   */
  composition?: {
    preferAsymmetric?: boolean;
    preferDarkVariants?: boolean;
  };
}

// ---------------------------------------------------------------------------
// LayoutComposition — role-tagged geometry, no style
// ---------------------------------------------------------------------------

/**
 * How a slot's content is expected to fit within its bounding box.
 *
 * - "single-line": the slot must hold ONE line of text at the active
 *   design system's role font size. If a phrase would exceed the
 *   estimated char budget, the model is expected to split it across
 *   additional slots of the same role rather than letting it wrap.
 *   Use for hero lines, eyebrows, chrome labels, footers — anywhere
 *   wrap-induced overflow would look broken.
 * - "multi-line": the slot can hold multiple wrapped lines up to the
 *   box's height. The budget is `charsPerLine × maxLines`. Use for
 *   body paragraphs, bullets, descriptions.
 */
export type FitMode = "single-line" | "multi-line";

/**
 * A single positioned slot in a composition. Carries a role and geometry
 * but NO style. Style comes from the active design system at compile time.
 *
 * `defaultText` is the placeholder the catalog dumps show; the model
 * overrides it when filling the layout with real content.
 */
export interface CompositionElement {
  id: string;
  role: ElementRole;
  x: number; // percent of canvas width
  y: number; // percent of canvas height
  w: number;
  h: number;
  /**
   * How content is expected to fit in this slot. Defaults to
   * "multi-line". Text-role slots without an explicit fit are assumed
   * wrappable — set "single-line" to mark display content that must
   * NOT wrap.
   */
  fit?: FitMode;
  defaultText?: string;
  /** For "image" role: optional placeholder src. */
  defaultSrc?: string;
}

export interface LayoutComposition {
  name: string;
  description: string;
  elements: CompositionElement[];
  /**
   * If true, the slide is rendered with a dark warm background and the
   * design system's `dark` overrides are applied. Use for cover slides,
   * chapter breaks, and statement slides where dark grounds carry
   * emotional weight.
   */
  darkBackground?: boolean;
  /**
   * Optional explicit slide background hex (overrides palette/default).
   * Honored regardless of `darkBackground` — useful for accent-tinted
   * backgrounds (e.g. a fully terracotta cover).
   */
  backgroundColor?: string;
}

// ---------------------------------------------------------------------------
// editorial-warm — one concrete design system: warm-tone editorial look
// ---------------------------------------------------------------------------

const MONO = "JetBrains Mono";

export const EDITORIAL_WARM: DesignSystem = {
  name: "editorial-warm",
  useFor:
    "warm-tone editorial decks — brand prospectus, founder narrative, hospitality, retail, food, culture.",
  composition: {
    preferAsymmetric: true,
    preferDarkVariants: false,
  },
  styles: {
    hero: {
      fontFamily: "heading",
      fontSize: 6.0,
      fontWeight: 400,
      color: "textPrimary",
      lineHeight: 1.0,
      align: "left",
    },
    "hero-accent": {
      fontFamily: "heading",
      fontSize: 6.0,
      fontWeight: 400,
      fontStyle: "italic",
      color: "accent",
      lineHeight: 1.0,
      align: "left",
    },
    subtitle: {
      fontFamily: "heading",
      fontSize: 2.2,
      fontWeight: 500,
      color: "textSecondary",
      lineHeight: 1.3,
      align: "left",
    },
    eyebrow: {
      fontFamily: MONO,
      fontSize: 1.2,
      fontWeight: 500,
      color: "accent",
      textTransform: "uppercase",
      letterSpacing: 0.16,
      align: "left",
    },
    body: {
      fontFamily: "body",
      fontSize: 1.8,
      fontWeight: 400,
      color: "textSecondary",
      lineHeight: 1.6,
      align: "left",
    },
    bullets: {
      fontFamily: "body",
      fontSize: 1.7,
      fontWeight: 400,
      color: "textSecondary",
      lineHeight: 1.75,
      align: "left",
    },
    "stat-value": {
      fontFamily: "heading",
      fontSize: 8.0,
      fontWeight: 400,
      color: "textPrimary",
      lineHeight: 1.0,
      align: "left",
    },
    "stat-label": {
      fontFamily: MONO,
      fontSize: 1.1,
      fontWeight: 500,
      color: "textMuted",
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    quote: {
      fontFamily: "heading",
      fontSize: 4.5,
      fontWeight: 400,
      fontStyle: "normal",
      color: "textPrimary",
      lineHeight: 1.2,
      align: "left",
    },
    attribution: {
      fontFamily: "heading",
      fontSize: 1.6,
      fontWeight: 400,
      fontStyle: "italic",
      color: "textPrimary",
      align: "left",
    },
    "chrome-left": {
      fontFamily: MONO,
      fontSize: 1.15,
      fontWeight: 500,
      color: "accent",
      textTransform: "uppercase",
      letterSpacing: 0.18,
      align: "left",
    },
    "chrome-right": {
      fontFamily: MONO,
      fontSize: 1.1,
      fontWeight: 500,
      color: "textMuted",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "right",
    },
    footer: {
      fontFamily: MONO,
      fontSize: 0.85,
      fontWeight: 500,
      color: "textMuted",
      textTransform: "uppercase",
      letterSpacing: 0.1,
      align: "left",
    },
    // Shape roles — fontFamily etc are unused but typed slots; the
    // compiler only reads `color` for fill/stroke.
    divider: {
      fontFamily: "body",
      fontSize: 0,
      color: "border",
    },
    "accent-bar": {
      fontFamily: "body",
      fontSize: 0,
      color: "accent",
    },
    image: {
      fontFamily: "body",
      fontSize: 0,
      color: "card",
    },
  },
  // When a composition has darkBackground: true, swap the text colors so
  // they read on dark warm-brown. The accent stays the same (it's already
  // tuned to work on both grounds). Roles not listed here inherit their
  // base style. We re-purpose existing palette tokens rather than adding
  // new ones: `slideBg` (cream) becomes our on-dark "textPrimary" color
  // and `border` (muted cream) becomes our on-dark "textMuted". This is
  // a deliberate token re-use — fine for the proposal; a real migration
  // would add explicit on-dark tokens to the palette.
  dark: {
    hero: { color: "slideBg" },
    // Accent on dark warm-brown reads better as a warm tan/gold than as
    // the palette's olive-green accent. Literal hex passes through the
    // renderer (anything starting with "#" or "rgb" bypasses the token
    // resolver), so we override without touching the palette.
    "hero-accent": { color: "#D8A673" },
    // Eyebrows are amber/mustard on dark — same palette family as the
    // brand mark but distinct from the hero-accent tan.
    eyebrow: { color: "#C99A4D" },
    subtitle: { color: "border" },
    body: { color: "border" },
    bullets: { color: "border" },
    "stat-value": { color: "slideBg" },
    "stat-label": { color: "border" },
    quote: { color: "slideBg" },
    attribution: { color: "slideBg" },
    "chrome-left": { color: "#D8763F" },
    "chrome-right": { color: "border" },
    footer: { color: "border" },
  },
  darkBackground: "#231A0F",
};

// ---------------------------------------------------------------------------
// techno-bold — a second design system to validate the architecture's
// leverage. Same compositions should produce a confident, technical
// product-launch look — Stripe / Linear / Vercel territory.
// ---------------------------------------------------------------------------

const SANS = "Inter";

export const TECHNO_BOLD: DesignSystem = {
  name: "techno-bold",
  useFor:
    "product launches, dev tools, fintech, AI infrastructure — confident technical voice with high-contrast modern typography.",
  composition: {
    preferAsymmetric: true,
    preferDarkVariants: true,
  },
  styles: {
    // Hero: heavy sans, tight letter-spacing, near-black on near-white.
    // No italic — the accent line distinguishes itself through COLOR
    // (saturated blue) rather than slant.
    hero: {
      fontFamily: SANS,
      fontSize: 6.5,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 0.95,
      letterSpacing: -0.02,
      align: "left",
    },
    "hero-accent": {
      fontFamily: SANS,
      fontSize: 6.5,
      fontWeight: 700,
      fontStyle: "normal",
      color: "#3B82F6",
      lineHeight: 0.95,
      letterSpacing: -0.02,
      align: "left",
    },
    subtitle: {
      fontFamily: SANS,
      fontSize: 2.0,
      fontWeight: 500,
      color: "#52525B",
      lineHeight: 1.3,
      align: "left",
    },
    eyebrow: {
      fontFamily: MONO,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#3B82F6",
      textTransform: "uppercase",
      letterSpacing: 0.18,
      align: "left",
    },
    body: {
      fontFamily: SANS,
      fontSize: 1.6,
      fontWeight: 400,
      color: "#52525B",
      lineHeight: 1.55,
      align: "left",
    },
    bullets: {
      fontFamily: SANS,
      fontSize: 1.5,
      fontWeight: 400,
      color: "#52525B",
      lineHeight: 1.7,
      align: "left",
    },
    "stat-value": {
      fontFamily: SANS,
      fontSize: 9.0,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.03,
      align: "left",
    },
    "stat-label": {
      fontFamily: MONO,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#71717A",
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    quote: {
      fontFamily: SANS,
      fontSize: 4.0,
      fontWeight: 600,
      color: "#0A0A0A",
      lineHeight: 1.2,
      letterSpacing: -0.02,
      align: "left",
    },
    attribution: {
      fontFamily: SANS,
      fontSize: 1.4,
      fontWeight: 500,
      color: "#0A0A0A",
      align: "left",
    },
    "chrome-left": {
      fontFamily: MONO,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#0A0A0A",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "left",
    },
    "chrome-right": {
      fontFamily: MONO,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#71717A",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "right",
    },
    footer: {
      fontFamily: MONO,
      fontSize: 0.85,
      fontWeight: 500,
      color: "#71717A",
      textTransform: "uppercase",
      letterSpacing: 0.1,
      align: "left",
    },
    divider: { fontFamily: SANS, fontSize: 0, color: "#E4E4E7" },
    "accent-bar": { fontFamily: SANS, fontSize: 0, color: "#3B82F6" },
    image: { fontFamily: SANS, fontSize: 0, color: "#0A0A0A" },
  },
  // Dark mode: invert near-black ↔ near-white, brighten the accent so
  // it stays vivid against pure black.
  dark: {
    hero: { color: "#FAFAFA" },
    "hero-accent": { color: "#60A5FA" },
    subtitle: { color: "#A1A1AA" },
    eyebrow: { color: "#60A5FA" },
    body: { color: "#A1A1AA" },
    bullets: { color: "#A1A1AA" },
    "stat-value": { color: "#FAFAFA" },
    "stat-label": { color: "#A1A1AA" },
    quote: { color: "#FAFAFA" },
    attribution: { color: "#FAFAFA" },
    "chrome-left": { color: "#FAFAFA" },
    "chrome-right": { color: "#A1A1AA" },
    footer: { color: "#71717A" },
    divider: { color: "#27272A" },
  },
  darkBackground: "#0A0A0A",
};

// ---------------------------------------------------------------------------
// Example composition — cover slide with text-left / image-right split
// ---------------------------------------------------------------------------

export const COVER_SPLIT_PORTRAIT: LayoutComposition = {
  name: "cover-split-portrait",
  description:
    "Dark warm cover: text panel on the left half, full-bleed image on the right. The hero is three positioned lines — regular / italic-accent / regular — each occupying its own emotional moment. Brand chrome top, hairline footer bottom.",
  darkBackground: true,
  elements: [
    // Left-panel text columns share a 6% right margin to the image edge:
    // content extends to x = 46, image starts at x = 52, leaving a 6% gap.
    //
    // Header chrome — top of canvas
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 22,
      h: 3,
      fit: "single-line",
      defaultText: "◆ EMBER & LEAF",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 28,
      y: 5,
      w: 18,
      h: 3,
      fit: "single-line",
      defaultText: "2026 / VOL. 04",
    },
    // Eyebrow — above the hero
    {
      id: "eyebrow",
      role: "eyebrow",
      x: 6,
      y: 33,
      w: 40,
      h: 3,
      fit: "single-line",
      defaultText: "FRANCHISE PARTNER PROSPECTUS",
    },
    // Hero — three positioned lines, each its own slot. Each slot's box
    // height (h) must be ≥ fontSize × 100 / canvas_h to avoid glyph
    // clipping. With fontSize 7% (= 67.2px) and canvas_h = 540, h ≥ 12.5%.
    // The model decides which lines are regular and which is accent by
    // choosing the role per slot when filling the composition.
    {
      id: "hero_1",
      role: "hero",
      x: 6,
      y: 38,
      w: 40,
      h: 14,
      fit: "single-line",
      defaultText: "Build a",
    },
    {
      id: "hero_2",
      role: "hero-accent",
      x: 6,
      y: 51,
      w: 40,
      h: 14,
      fit: "single-line",
      defaultText: "teahouse",
    },
    {
      id: "hero_3",
      role: "hero",
      x: 6,
      y: 64,
      w: 40,
      h: 14,
      fit: "single-line",
      defaultText: "that pays.",
    },
    // Body — under the hero. multi-line; the renderer wraps within the
    // box and the model is told the per-line / total char budget.
    {
      id: "body",
      role: "body",
      x: 6,
      y: 79,
      w: 40,
      h: 12,
      fit: "multi-line",
      defaultText:
        "A modern Asian tea & comfort-food chain. Open Studio, Flagship, and Kiosk formats.",
    },
    // Footer band — hairline + small mono note
    {
      id: "footer_rule",
      role: "divider",
      x: 6,
      y: 92,
      w: 40,
      h: 0,
    },
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 94,
      w: 40,
      h: 2.5,
      fit: "single-line",
      defaultText: "CONFIDENTIAL · PROSPECTIVE FRANCHISEES ONLY · NOT AN OFFER TO SELL",
    },
    // Image — right half full-bleed, pulled in by 2% to leave a gap
    // between the left-panel text column and the image edge. No
    // defaultSrc: each design system supplies a placeholder color that
    // matches its slide ground, so we generate the URL in compile().
    {
      id: "image",
      role: "image",
      x: 52,
      y: 0,
      w: 48,
      h: 100,
    },
  ],
};

// ---------------------------------------------------------------------------
// compile — composition × design system → renderable JSX
// ---------------------------------------------------------------------------

const CANVAS_W = 960;
const CANVAS_H = 540;
const pxX = (pct: number) => round2(pct * (CANVAS_W / 100));
const pxY = (pct: number) => round2(pct * (CANVAS_H / 100));
const pxFontSize = (pct: number) => round2(pct * (CANVAS_W / 100));
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveFontFamily(
  family: string,
  fontPreset: { heading: string; body: string }
): string {
  if (family === "heading") return fontPreset.heading;
  if (family === "body") return fontPreset.body;
  return family;
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Merge a dark-mode partial override onto a base RoleStyle. Returns the
 * base unchanged when no override exists.
 */
function applyDark(base: RoleStyle, override?: Partial<RoleStyle>): RoleStyle {
  if (!override) return base;
  return { ...base, ...override };
}

function styleObject(s: RoleStyle, fontPreset: { heading: string; body: string }): string {
  const props: string[] = [
    `fontSize: ${pxFontSize(s.fontSize)}`,
    `fontWeight: ${s.fontWeight ?? 400}`,
    `color: "${s.color}"`,
  ];
  if (s.fontStyle) props.push(`fontStyle: "${s.fontStyle}"`);
  if (s.textTransform) props.push(`textTransform: "${s.textTransform}"`);
  if (s.letterSpacing !== undefined) props.push(`letterSpacing: ${s.letterSpacing}`);
  if (s.lineHeight !== undefined) props.push(`lineHeight: ${s.lineHeight}`);
  if (s.align) props.push(`textAlign: "${s.align}"`);
  props.push(`fontFamily: "${resolveFontFamily(s.fontFamily, fontPreset)}"`);
  return `{{ ${props.join(", ")} }}`;
}

function emitText(
  el: CompositionElement,
  s: RoleStyle,
  fontPreset: { heading: string; body: string }
): string {
  const text = el.defaultText ?? "";
  const fontRole = s.fontFamily === "heading" ? "heading" : "body";
  const style = styleObject(s, fontPreset);
  const body = escapeText(text);
  return `<Anuma.Text id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} fontRole="${fontRole}" style=${style}>${body}</Anuma.Text>`;
}

function emitDivider(el: CompositionElement, s: RoleStyle): string {
  return `<Anuma.Line id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={0} stroke="${s.color}" strokeWidth={1} />`;
}

function emitAccentBar(el: CompositionElement, s: RoleStyle): string {
  return `<Anuma.Rect id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} fill="${s.color}" cornerRadius={0.2} />`;
}

function emitImage(el: CompositionElement, system: DesignSystem, dark: boolean): string {
  // Generate a placeholder that matches the slide ground: in dark mode
  // use the system's dark bg; otherwise a neutral light gray. This keeps
  // the image area visually coherent with the design system while we
  // wait for a real image-generation pipeline.
  const bgHex = dark ? (system.darkBackground ?? "#1a1a1a") : "#E5E5E5";
  const fgHex = dark ? "#3F3F3F" : "#9E9E9E";
  const stripHash = (s: string) => s.replace(/^#/, "");
  const src =
    el.defaultSrc ??
    `https://placehold.co/1200x1200/${stripHash(bgHex)}/${stripHash(fgHex)}?text=Photography`;
  return `<Anuma.Image id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} src="${escapeText(src)}" />`;
}

/**
 * Compile a composition + design system into a `<Anuma.Slide>` JSX string
 * ready to drop inside a `<Anuma.Deck>`. The deck wrapper supplies the
 * fontPreset and palette tokens that the role styles reference.
 */
export function compile(
  composition: LayoutComposition,
  system: DesignSystem,
  fontPreset: { heading: string; body: string },
  slideId?: string
): string {
  const dark = composition.darkBackground === true;
  const lines: string[] = [];
  for (const el of composition.elements) {
    const base = system.styles[el.role];
    if (!base)
      throw new Error(`Design system "${system.name}" missing style for role "${el.role}"`);
    const s = dark ? applyDark(base, system.dark?.[el.role]) : base;
    switch (el.role) {
      case "divider":
        lines.push(emitDivider(el, s));
        break;
      case "accent-bar":
        lines.push(emitAccentBar(el, s));
        break;
      case "image":
        lines.push(emitImage(el, system, dark));
        break;
      default:
        lines.push(emitText(el, s, fontPreset));
    }
  }
  // Per-slide background precedence:
  //   1. composition.backgroundColor — explicit override (rare).
  //   2. system.darkBackground — design system's dark mode color.
  //   3. Fall back to a generic dark default if dark but unspecified.
  const bg = composition.backgroundColor
    ? composition.backgroundColor
    : dark
      ? (system.darkBackground ?? "#0A0A0A")
      : null;
  const bgAttr = bg ? ` background="${bg}"` : "";
  const id = slideId ?? composition.name;
  return `<Anuma.Slide id="${id}"${bgAttr}>\n${lines.join("\n")}\n</Anuma.Slide>`;
}

// ---------------------------------------------------------------------------
// Slot budgeting — the LLM-facing constraint communication layer
// ---------------------------------------------------------------------------

/**
 * Estimated content capacity of a slot, given the active design system's
 * font for the slot's role. Both numbers are integer approximations:
 *
 *   visible width ≈ chars × fontSize × charWidthFactor(family, weight)
 *
 * The factor is rough but consistent enough across families to give the
 * model a reliable budget. When this estimate is wrong, the answer is to
 * tune the factor table — not to special-case at every slot site.
 */
export interface SlotBudget {
  charsPerLine: number;
  maxLines: number;
  /** charsPerLine × maxLines — total content budget for multi-line slots. */
  total: number;
}

// Width-per-character expressed as a fraction of fontSize. Numbers are
// empirical averages, not exact metrics: visible width varies with weight,
// glyph mix, and tracking, but the budget the model needs is approximate
// anyway (it'll round down or rephrase). Tuned against the renderHtml.ts
// fonts used today.
const CHAR_WIDTH_FACTOR = {
  mono: 0.6,
  serif: 0.48,
  sans: 0.52,
  sansBold: 0.56,
} as const;

function resolveFamily(
  style: RoleStyle,
  fontPreset: { heading: string; body: string }
): string {
  if (style.fontFamily === "heading") return fontPreset.heading;
  if (style.fontFamily === "body") return fontPreset.body;
  return style.fontFamily;
}

function charWidthFactor(
  style: RoleStyle,
  fontPreset: { heading: string; body: string }
): number {
  const family = resolveFamily(style, fontPreset).toLowerCase();
  if (/mono|jetbrains|courier|menlo|consolas/.test(family)) return CHAR_WIDTH_FACTOR.mono;
  if (/serif|crimson|playfair|times|garamond|georgia|baskerville/.test(family)) {
    return CHAR_WIDTH_FACTOR.serif;
  }
  const isBold = (style.fontWeight ?? 400) >= 600;
  return isBold ? CHAR_WIDTH_FACTOR.sansBold : CHAR_WIDTH_FACTOR.sans;
}

/**
 * Compute the slot's expected content budget for a given (slot, role
 * style, fontPreset) triple. Pure function — no rendering side effects.
 */
export function estimateSlotBudget(
  el: CompositionElement,
  style: RoleStyle,
  fontPreset: { heading: string; body: string }
): SlotBudget {
  const fontSizePx = pxFontSize(style.fontSize);
  const boxWidthPx = pxX(el.w);
  const boxHeightPx = pxY(el.h);
  const factor = charWidthFactor(style, fontPreset);
  const charsPerLine = Math.max(1, Math.floor(boxWidthPx / (fontSizePx * factor)));
  const lineHeight = style.lineHeight ?? 1.2;
  const linePx = fontSizePx * lineHeight;
  const maxLines = Math.max(1, Math.floor(boxHeightPx / linePx));
  return { charsPerLine, maxLines, total: charsPerLine * maxLines };
}

const STATIC_ROLES: ReadonlySet<ElementRole> = new Set(["divider", "accent-bar", "image"]);

/**
 * Produce a prompt-friendly recipe describing every slot's role, fit
 * mode, and char budget under the active design system. This is what the
 * LLM reads when asked to fill a composition — option 3 from the
 * "content vs font" discussion: the constraint is communicated to the
 * model rather than enforced by auto-shrinking at render time.
 */
export function describeComposition(
  composition: LayoutComposition,
  system: DesignSystem,
  fontPreset: { heading: string; body: string }
): string {
  const out: string[] = [
    `Composition: ${composition.name}`,
    `Design system: ${system.name}`,
    `Slide ground: ${composition.darkBackground ? "dark" : "light"}`,
    "",
    composition.description,
    "",
    "Fill the slots below. Respect each slot's char budget — if a phrase exceeds a single-line budget, split it across additional slots of the same role (e.g. hero phrases are typically split into 2–3 hero lines, one per emotional beat).",
    "",
    "Slots:",
  ];
  for (const el of composition.elements) {
    if (STATIC_ROLES.has(el.role)) {
      out.push(`  - ${el.id} [${el.role}]: static element, no content`);
      continue;
    }
    const style = system.styles[el.role];
    if (!style) continue;
    const budget = estimateSlotBudget(el, style, fontPreset);
    const fit: FitMode = el.fit ?? "multi-line";
    if (fit === "single-line") {
      out.push(`  - ${el.id} [${el.role}]: ≤ ${budget.charsPerLine} chars, ONE LINE.`);
    } else {
      out.push(
        `  - ${el.id} [${el.role}]: ≤ ${budget.charsPerLine} chars/line × ${budget.maxLines} lines (~${budget.total} chars total).`
      );
    }
  }
  return out.join("\n");
}

/** A slot whose `defaultText` exceeds the slot's budget under the system. */
export interface SlotIssue {
  id: string;
  role: ElementRole;
  text: string;
  budget: SlotBudget;
  fit: FitMode;
  issue: string;
}

/**
 * Sanity-check a composition's placeholder content against the active
 * design system's budgets. Useful at authoring time to catch slots whose
 * default text would overflow.
 */
export function validateComposition(
  composition: LayoutComposition,
  system: DesignSystem,
  fontPreset: { heading: string; body: string }
): SlotIssue[] {
  const issues: SlotIssue[] = [];
  for (const el of composition.elements) {
    if (STATIC_ROLES.has(el.role)) continue;
    const style = system.styles[el.role];
    if (!style || !el.defaultText) continue;
    const budget = estimateSlotBudget(el, style, fontPreset);
    const fit: FitMode = el.fit ?? "multi-line";
    const text = el.defaultText.trim();
    if (fit === "single-line" && text.length > budget.charsPerLine) {
      issues.push({
        id: el.id,
        role: el.role,
        text,
        budget,
        fit,
        issue: `single-line: ${text.length} chars exceeds ${budget.charsPerLine}-char budget`,
      });
    } else if (fit === "multi-line" && text.length > budget.total) {
      issues.push({
        id: el.id,
        role: el.role,
        text,
        budget,
        fit,
        issue: `multi-line: ${text.length} chars exceeds ${budget.total}-char budget (${budget.maxLines}×${budget.charsPerLine})`,
      });
    }
  }
  return issues;
}
