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
  | "card-surface" // filled rectangle that defines a card's ground
  | "card-eyebrow" // mono uppercase label / number inside a card ("01")
  | "card-title" // serif heading inside a card
  | "card-body" // body paragraph inside a card
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
 * A surface state — controls both the fill color of `card-surface`
 * elements and which style overrides apply to text/shape elements that
 * sit on that surface.
 *
 * - "default": base styles, no overrides. Slide-level light ground.
 * - "dark": dark ground (warm-brown, near-black, etc.) with cream text.
 * - "accent": brand-accent ground (terracotta, vivid blue) with text
 *   tuned for contrast against it.
 *
 * Surfaces work at two levels:
 *   1. Slide-level (composition.surface): the whole slide ground.
 *   2. Element-level (element.surface): a card, panel, or callout
 *      *inside* a slide whose ground differs from the slide's.
 * Element-level overrides take precedence. Text styling resolves
 * against the nearest enclosing surface state declared on the element.
 */
export type SurfaceState = "default" | "dark" | "accent";

/**
 * The treatment a design system applies for one non-default surface
 * state. Carries both the fill color used by `card-surface` elements
 * and the per-role style overrides that apply to text/shape elements
 * resolved against that surface.
 */
export interface SurfaceTreatment {
  /** Fill color used for slide ground or card-surface elements. */
  background: string;
  /** Per-role style overrides applied when an element is on this surface. */
  overrides: Partial<Record<ElementRole, Partial<RoleStyle>>>;
}

/**
 * A named, self-contained visual identity. Maps every role to a concrete
 * style and declares surface overrides per non-default state. New design
 * system = one file edit, no changes to layouts.
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
  /** The role → style map for the default (light) surface. */
  styles: Record<ElementRole, RoleStyle>;
  /**
   * Per-surface-state treatments. Each entry declares a background color
   * plus per-role overrides applied to elements sitting on that surface.
   * Roles not listed inherit base styles.
   */
  surfaces?: Partial<Record<Exclude<SurfaceState, "default">, SurfaceTreatment>>;
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
  /**
   * Surface state for THIS element. Defaults to the slide's
   * `composition.surface` (or "default" if unset). Set explicitly when
   * the element sits on a different ground than the slide — e.g. a
   * dark card on a light slide, or an accent-filled callout. For
   * `card-surface` elements, this drives the fill color; for text/shape
   * elements, this drives which surface-overrides resolve the style.
   */
  surface?: SurfaceState;
  defaultText?: string;
  /** For "image" role: optional placeholder src. */
  defaultSrc?: string;
}

export interface LayoutComposition {
  name: string;
  description: string;
  elements: CompositionElement[];
  /**
   * The slide's ground surface. "default" is the design system's light
   * mode; "dark" applies the system's dark surface treatment to the
   * whole slide; "accent" uses the brand-accent surface. Defaults to
   * "default" when omitted.
   */
  surface?: SurfaceState;
  /**
   * Optional explicit slide background hex (overrides system default).
   * Honored regardless of `surface` — useful for one-off tinted
   * backgrounds that aren't part of the design system's surface set.
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
    // Card roles — used inside `card-surface` groups.
    "card-eyebrow": {
      fontFamily: MONO,
      fontSize: 1.0,
      fontWeight: 500,
      color: "accent",
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    "card-title": {
      fontFamily: "heading",
      fontSize: 2.0,
      fontWeight: 600,
      color: "textPrimary",
      lineHeight: 1.25,
      align: "left",
    },
    "card-body": {
      fontFamily: "body",
      fontSize: 1.5,
      fontWeight: 400,
      color: "textSecondary",
      lineHeight: 1.55,
      align: "left",
    },
    // Shape roles — fontFamily etc are unused but typed slots; the
    // compiler only reads `color` for fill/stroke.
    "card-surface": {
      fontFamily: "body",
      fontSize: 0,
      color: "slideBg",
    },
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
  // Per-surface treatments. Each declares both the fill color used for
  // slide ground / card-surface fills and the per-role overrides applied
  // to text elements resolved against that surface. We re-purpose
  // existing palette tokens where possible (`slideBg` becomes on-dark
  // text, `border` becomes on-dark muted), with literal hex for accent
  // colors that aren't in the palette.
  surfaces: {
    dark: {
      background: "#231A0F",
      overrides: {
        hero: { color: "slideBg" },
        // Accent on dark warm-brown reads better as a warm tan/gold than
        // the palette's olive-green accent.
        "hero-accent": { color: "#D8A673" },
        eyebrow: { color: "#C99A4D" },
        subtitle: { color: "border" },
        body: { color: "border" },
        bullets: { color: "border" },
        "stat-value": { color: "slideBg" },
        "stat-label": { color: "border" },
        quote: { color: "slideBg" },
        attribution: { color: "slideBg" },
        "card-title": { color: "slideBg" },
        "card-body": { color: "border" },
        "card-eyebrow": { color: "#C99A4D" },
        "chrome-left": { color: "#D8763F" },
        "chrome-right": { color: "border" },
        footer: { color: "border" },
      },
    },
    accent: {
      // Saturated terracotta ground from the source decks.
      background: "#B85A2E",
      overrides: {
        // Text on the terracotta accent stays warm-dark — the punch
        // comes from the ground, not from the type.
        hero: { color: "#1F1A14" },
        "hero-accent": { color: "#1F1A14" },
        eyebrow: { color: "#5C2812" },
        subtitle: { color: "#3C2A1F" },
        body: { color: "#3C2A1F" },
        bullets: { color: "#3C2A1F" },
        "stat-value": { color: "#1F1A14" },
        "stat-label": { color: "#5C2812" },
        quote: { color: "#1F1A14" },
        attribution: { color: "#1F1A14" },
        "card-title": { color: "#1F1A14" },
        "card-body": { color: "#3C2A1F" },
        "card-eyebrow": { color: "#5C2812" },
        footer: { color: "#5C2812" },
      },
    },
  },
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
    "card-eyebrow": {
      fontFamily: MONO,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#3B82F6",
      textTransform: "uppercase",
      letterSpacing: 0.16,
      align: "left",
    },
    "card-title": {
      fontFamily: SANS,
      fontSize: 2.0,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 1.2,
      letterSpacing: -0.02,
      align: "left",
    },
    "card-body": {
      fontFamily: SANS,
      fontSize: 1.4,
      fontWeight: 400,
      color: "#52525B",
      lineHeight: 1.5,
      align: "left",
    },
    "card-surface": { fontFamily: SANS, fontSize: 0, color: "#FAFAFA" },
    divider: { fontFamily: SANS, fontSize: 0, color: "#E4E4E7" },
    "accent-bar": { fontFamily: SANS, fontSize: 0, color: "#3B82F6" },
    image: { fontFamily: SANS, fontSize: 0, color: "#0A0A0A" },
  },
  // Per-surface treatments — same shape as editorial-warm.
  surfaces: {
    dark: {
      background: "#0A0A0A",
      overrides: {
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
        "card-eyebrow": { color: "#60A5FA" },
        "card-title": { color: "#FAFAFA" },
        "card-body": { color: "#A1A1AA" },
        "chrome-left": { color: "#FAFAFA" },
        "chrome-right": { color: "#A1A1AA" },
        footer: { color: "#71717A" },
        divider: { color: "#27272A" },
      },
    },
    accent: {
      // Saturated brand blue. Text reads as light cream for contrast.
      background: "#3B82F6",
      overrides: {
        hero: { color: "#FAFAFA" },
        "hero-accent": { color: "#FAFAFA" },
        subtitle: { color: "#DBEAFE" },
        eyebrow: { color: "#FAFAFA" },
        body: { color: "#DBEAFE" },
        bullets: { color: "#DBEAFE" },
        "stat-value": { color: "#FAFAFA" },
        "stat-label": { color: "#DBEAFE" },
        quote: { color: "#FAFAFA" },
        attribution: { color: "#FAFAFA" },
        "card-eyebrow": { color: "#FAFAFA" },
        "card-title": { color: "#FAFAFA" },
        "card-body": { color: "#DBEAFE" },
        footer: { color: "#DBEAFE" },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Example composition — cover slide with text-left / image-right split
// ---------------------------------------------------------------------------

export const COVER_SPLIT_PORTRAIT: LayoutComposition = {
  name: "cover-split-portrait",
  description:
    "Dark warm cover: text panel on the left half, full-bleed image on the right. The hero is three positioned lines — regular / italic-accent / regular — each occupying its own emotional moment. Brand chrome top, hairline footer bottom.",
  surface: "dark",
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
// MARKETING_GRID — a 2×2 card grid where each card declares its own surface
// state independently. Exercises the multi-state surface flag: two cards
// stay on the default ground, one card is dark, one is accent. Same
// composition, same design system, different surface mix per card.
// ---------------------------------------------------------------------------

/**
 * Helper to build the three elements of one card: surface rect, eyebrow,
 * and title. All three share the same `surface` state so text inside
 * the card resolves against the card's ground, not the slide's.
 */
function card(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  surface: SurfaceState,
  eyebrow: string,
  title: string
): CompositionElement[] {
  // Inner padding for text inside the card: 5% of canvas width.
  const px = 2;
  return [
    { id: `${id}_surface`, role: "card-surface", surface, x, y, w, h },
    {
      id: `${id}_eyebrow`,
      role: "card-eyebrow",
      surface,
      x: x + px,
      y: y + 2,
      w: w - 2 * px,
      h: 3,
      fit: "single-line",
      defaultText: eyebrow,
    },
    {
      id: `${id}_title`,
      role: "card-title",
      surface,
      x: x + px,
      y: y + 6,
      w: w - 2 * px,
      h: h - 8,
      fit: "multi-line",
      defaultText: title,
    },
  ];
}

export const MARKETING_GRID: LayoutComposition = {
  name: "marketing-grid",
  description:
    "Light slide with a 2-line hero on top and a 2×2 card grid below. Each card declares its own surface state (default / dark / accent), so a single grid can mix neutral, dark-emphasized, and brand-accent cards without changing the composition.",
  elements: [
    // Chrome row
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "◆ 08 / OPERATIONS",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "23 / 28",
    },
    // Two-line hero — text tuned to fit techno-bold's narrower per-line
    // budget (sans-bold is ~28% wider per character than serif).
    {
      id: "hero_1",
      role: "hero",
      x: 6,
      y: 18,
      w: 82,
      h: 12,
      fit: "single-line",
      defaultText: "Marketing & tech,",
    },
    {
      id: "hero_2",
      role: "hero-accent",
      x: 6,
      y: 30,
      w: 82,
      h: 12,
      fit: "single-line",
      defaultText: "quietly in the back.",
    },
    // 2×2 card grid — each card declares its own surface state.
    ...card(
      "card_1",
      6,
      52,
      42,
      22,
      "default",
      "01 · BRAND FUND",
      "National creative + paid social + influencer cohort. We produce, you translate."
    ),
    ...card(
      "card_2",
      52,
      52,
      42,
      22,
      "default",
      "02 · TECH STACK",
      "EMBER POS + KDS + inventory + loyalty app + financial dashboard. One log-in, no per-seat fees."
    ),
    ...card(
      "card_3",
      6,
      76,
      42,
      22,
      "dark",
      "03 · LAUNCH PACKAGE",
      "$8,000 grand-opening kit: geo-targeted ads, sample drops, KOL/KOC seeding, day-1 PR notes."
    ),
    ...card(
      "card_4",
      52,
      76,
      42,
      22,
      "accent",
      "04 · OPERATOR SUPPORT",
      "Regional ops manager, 24/7 hotline, quarterly P&L review, semi-annual compliance audit."
    ),
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
 * Resolve the effective style for an element given the design system,
 * element role, and the surface state that element sits on. For the
 * default surface, returns base styles unchanged. For non-default
 * surfaces, merges that surface's per-role override over the base.
 */
function resolveStyle(
  system: DesignSystem,
  role: ElementRole,
  state: SurfaceState
): RoleStyle {
  const base = system.styles[role];
  if (!base) throw new Error(`Design system "${system.name}" missing style for role "${role}"`);
  if (state === "default") return base;
  const treatment = system.surfaces?.[state];
  const override = treatment?.overrides[role];
  return override ? { ...base, ...override } : base;
}

/**
 * The fill color for the slide ground, or for a card-surface element,
 * under the given surface state. Returns null for "default" so the
 * caller can decide whether to omit the bg attribute entirely.
 */
function surfaceBackground(system: DesignSystem, state: SurfaceState): string | null {
  if (state === "default") return null;
  return system.surfaces?.[state]?.background ?? "#1a1a1a";
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

function emitImage(el: CompositionElement, system: DesignSystem, state: SurfaceState): string {
  // Placeholder color tracks the surface state so the image area stays
  // visually coherent with the slide ground until we have real image
  // generation.
  const isLight = state === "default";
  const bgHex = isLight ? "#E5E5E5" : (surfaceBackground(system, state) ?? "#1a1a1a");
  const fgHex = isLight ? "#9E9E9E" : "#3F3F3F";
  const stripHash = (s: string) => s.replace(/^#/, "");
  const src =
    el.defaultSrc ??
    `https://placehold.co/1200x1200/${stripHash(bgHex)}/${stripHash(fgHex)}?text=Photography`;
  return `<Anuma.Image id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} src="${escapeText(src)}" />`;
}

function emitCardSurface(el: CompositionElement, system: DesignSystem, state: SurfaceState): string {
  // For default state, use the role's base color (typically the cream
  // `slideBg`/`#FAFAFA`); for dark/accent, pull the surface's bg color.
  const fill =
    state === "default"
      ? system.styles["card-surface"].color
      : (surfaceBackground(system, state) ?? "#1a1a1a");
  return `<Anuma.Rect id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} fill="${fill}" cornerRadius={0.3} />`;
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
  const slideState: SurfaceState = composition.surface ?? "default";
  const lines: string[] = [];
  for (const el of composition.elements) {
    // Element-level surface overrides the slide-level surface.
    const elState: SurfaceState = el.surface ?? slideState;
    const s = resolveStyle(system, el.role, elState);
    switch (el.role) {
      case "divider":
        lines.push(emitDivider(el, s));
        break;
      case "accent-bar":
        lines.push(emitAccentBar(el, s));
        break;
      case "card-surface":
        lines.push(emitCardSurface(el, system, elState));
        break;
      case "image":
        lines.push(emitImage(el, system, elState));
        break;
      default:
        lines.push(emitText(el, s, fontPreset));
    }
  }
  // Per-slide background precedence:
  //   1. composition.backgroundColor — explicit override.
  //   2. The design system's surface background for the slide's state.
  //   3. No bg attribute (renderer uses deck-level slideBg).
  const bg =
    composition.backgroundColor ?? surfaceBackground(system, slideState);
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

const STATIC_ROLES: ReadonlySet<ElementRole> = new Set([
  "divider",
  "accent-bar",
  "image",
  "card-surface",
]);

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
    `Slide surface: ${composition.surface ?? "default"}`,
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
