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
  | "stat-display" // massive display number that IS the slide — "$40M", "$1B", "10M" — 3× bigger than stat-value
  | "stat-value" // big featured number ("62", "95%", "+240") — slide-hero scale
  | "stat-value-mid" // medium stat for cards ("30,000+", "5,000+") — between hero and row
  | "stat-value-small" // small stat in a bottom-row context ("$9.50", "2.4×")
  | "stat-label" // small caption under a stat
  | "quote" // pull-quote text — one line of a multi-line quote (regular)
  | "quote-accent" // pull-quote text — the italic accent line
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
  | "marker" // small filled circle — timeline dots, list bullets (shape role)
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
   * Background color for the default (non-dark, non-accent) surface.
   * Compositions emit this as the slide's `background=` so the system's
   * literal-hex text colors stay readable even when the deck-level
   * palette specifies a contrasting slideBg. Omit only if the system
   * truly adapts to any backdrop.
   */
  defaultBackground?: string;
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
  /**
   * Optional accent color slot. Declares the system's default accent hex
   * (`base`, used on light surfaces) plus its dark-surface variant
   * (`onDark`, lightened so it stays legible against the dark
   * background). When `applyAccent()` is called, it walks the system's
   * `styles` and `surfaces` and substitutes any role color matching
   * `base` with the override, and any matching `onDark` with the
   * override's dark variant. Omit on monochrome systems (CORPORATE_MODERN)
   * and palette-driven systems (EDITORIAL_WARM); their `applyAccent()`
   * call is a no-op.
   */
  accent?: {
    base: string;
    onDark: string;
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
  /**
   * Optional per-element alignment override. Roles define default
   * alignment ("left" for most), but compositions sometimes need a
   * specific slot to right-align (e.g. an inline-italic-accent prefix
   * that needs to abut the next slot) or center-align (e.g. a featured
   * stat on a stats-only slide). Position is a composition concern, not
   * a design-system concern, so this lives at the element level.
   */
  align?: "left" | "center" | "right";
  defaultText?: string;
  /** For "image" role: optional placeholder src. */
  defaultSrc?: string;
}

/**
 * A sub-element inside a FlexRegion item template. Unlike CompositionElement
 * it doesn't have absolute x/y — its position is determined by the parent
 * Group's flex flow. Its `w` and `h` are still meaningful for sizing
 * (used by validators and the Anuma renderer for fixed-dimension children)
 * but the renderer lays them out via the parent's `layout` direction.
 *
 * Slot ids carry an `${index}` placeholder; compile() interpolates the
 * 1-based item index at emit time (`agenda_${index}_title` → `agenda_1_title`,
 * `agenda_2_title`, ...).
 */
export interface RelativeElement {
  /** Slot id pattern. `${index}` is replaced with the 1-based item index. */
  id: string;
  role: ElementRole;
  /** Width in canvas-percent. Ignored when the parent flex axis assigns it. */
  w?: number;
  /** Height in canvas-percent. Ignored when the parent flex axis assigns it. */
  h?: number;
  /** Optional flex grow factor for sizing within the parent group. */
  grow?: number;
  fit?: FitMode;
  surface?: SurfaceState;
  align?: "left" | "center" | "right";
  defaultText?: string;
}

/**
 * Default content for ONE item inside a FlexRegion. The map keys match
 * the RelativeElement ids in the region's template (without the index
 * suffix). The compiler uses these to fill placeholder content per item
 * when the catalog dumps render the recipe.
 */
export type FlexItemDefault = Record<string, string>;

/**
 * A repeating flex region inside a composition. The region's own frame
 * is fixed (x/y/w/h), but it hosts a variable number of items rendered
 * as an `<Anuma.Group layout="row" | "column">`. Each item is one
 * realisation of the `item` template — same role pattern, sequential
 * slot ids (`agenda_1_title`, `agenda_2_title`, …). Use this for agendas,
 * bullet lists, dynamic card grids, timeline rows.
 */
export interface FlexRegion {
  /** Discriminator — separates flex regions from absolute elements. */
  kind: "flex-region";
  /** Prefix for slot ids inside this region (e.g. "agenda_"). */
  idPrefix: string;
  /** Container frame on the slide canvas. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Flex direction. "column" stacks items vertically; "row" lays them horizontally. */
  layout: "row" | "column";
  /** Spacing between items in canvas-percent. */
  gap?: number;
  /** Inner padding around the item track in canvas-percent. */
  padding?: number;
  justify?: "start" | "center" | "end" | "space-between";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Surface state for items inside the region (defaults to slide's surface). */
  surface?: SurfaceState;
  /**
   * Internal layout direction inside each item. Defaults to "row" — an
   * agenda row lays its sub-elements left-to-right (number / title /
   * description / duration).
   */
  itemLayout?: "row" | "column";
  /** Gap between sub-elements within one item, in canvas-percent. */
  itemGap?: number;
  /** justify-content within each item. */
  itemJustify?: "start" | "center" | "end" | "space-between";
  /**
   * align-items within each item. "baseline" aligns text by typographic
   * baseline — useful when sub-elements have different font sizes (e.g.
   * a small mono number next to a serif title in an agenda row).
   */
  itemAlign?: "start" | "center" | "end" | "stretch" | "baseline";
  /**
   * Emit a hairline divider after every item. Renders as a flex sibling
   * `<Anuma.Line>` between consecutive items (and after the last). Uses
   * the design system's `divider` role color. Useful for agendas and
   * table-of-contents patterns where each row needs visual separation.
   */
  separator?: boolean;
  /**
   * The template item — a list of RelativeElements describing the
   * sub-elements of ONE item. compile() emits N copies with sequential
   * slot ids.
   */
  item: RelativeElement[];
  /**
   * Default item content for the catalog dump. compile() emits one
   * Anuma.Group child per entry, populating each child's template
   * elements with the entry's text by RelativeElement id.
   */
  defaultItems: FlexItemDefault[];
}

/** Union — a composition's elements field can hold either kind. */
export type CompositionChild = CompositionElement | FlexRegion;

/** Type guard for FlexRegion vs CompositionElement. */
export function isFlexRegion(c: CompositionChild): c is FlexRegion {
  return (c as FlexRegion).kind === "flex-region";
}

export interface LayoutComposition {
  name: string;
  description: string;
  elements: CompositionChild[];
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
      // Editorial-warm uses two distinct accents: terracotta for hero
      // italic + chrome (warmer, more emotive), olive green for body
      // eyebrows (cooler, more structural). The palette's `accent` token
      // is the green; we override hero-accent to the terracotta literal.
      color: "#B85A2E",
      lineHeight: 1.0,
      align: "left",
    },
    subtitle: {
      fontFamily: "heading",
      fontSize: 3.2,
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
    "stat-display": {
      fontFamily: "heading",
      fontSize: 14,
      fontWeight: 500,
      color: "textPrimary",
      lineHeight: 1.0,
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
    "stat-value-mid": {
      fontFamily: "heading",
      fontSize: 5.5,
      fontWeight: 500,
      color: "textPrimary",
      lineHeight: 1.0,
      align: "left",
    },
    "stat-value-small": {
      fontFamily: "heading",
      fontSize: 3.5,
      fontWeight: 500,
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
      fontSize: 3.8,
      fontWeight: 400,
      fontStyle: "normal",
      color: "textPrimary",
      lineHeight: 1.2,
      align: "left",
    },
    "quote-accent": {
      fontFamily: "heading",
      fontSize: 3.8,
      fontWeight: 400,
      fontStyle: "italic",
      color: "accent",
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
      // Chrome shares the terracotta accent with hero-accent (warmer
      // brand color), not the palette's olive green which is used only
      // for body eyebrows and other structural-accent moments.
      color: "#B85A2E",
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
    marker: {
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
        "stat-display": { color: "slideBg" },
        "stat-value": { color: "slideBg" },
        "stat-value-mid": { color: "slideBg" },
        "stat-value-small": { color: "slideBg" },
        "stat-label": { color: "border" },
        quote: { color: "slideBg" },
        "quote-accent": { color: "#D8A673" },
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
        "stat-display": { color: "#1F1A14" },
        "stat-value": { color: "#1F1A14" },
        "stat-value-mid": { color: "#1F1A14" },
        "stat-value-small": { color: "#1F1A14" },
        "stat-label": { color: "#5C2812" },
        quote: { color: "#1F1A14" },
        "quote-accent": { color: "#1F1A14" },
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
  // techno-bold uses literal hex for every role (color "#0A0A0A" etc.) —
  // those don't read the deck's palette. Force the slide ground to a
  // near-white surface so dark text stays legible even when the deck
  // wrapper specifies a contrasting slideBg.
  defaultBackground: "#FAFAFA",
  accent: { base: "#3B82F6", onDark: "#60A5FA" },
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
      fontSize: 3.2,
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
    "stat-display": {
      fontFamily: SANS,
      fontSize: 14,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.03,
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
    "stat-value-mid": {
      fontFamily: SANS,
      fontSize: 5.0,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.02,
      align: "left",
    },
    "stat-value-small": {
      fontFamily: SANS,
      fontSize: 3.4,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.02,
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
      fontSize: 3.4,
      fontWeight: 600,
      color: "#0A0A0A",
      lineHeight: 1.2,
      letterSpacing: -0.02,
      align: "left",
    },
    "quote-accent": {
      // Techno-bold: accent is color-only (vivid blue), not italic.
      fontFamily: SANS,
      fontSize: 3.4,
      fontWeight: 600,
      fontStyle: "normal",
      color: "#3B82F6",
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
    marker: { fontFamily: SANS, fontSize: 0, color: "#3B82F6" },
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
        "stat-display": { color: "#FAFAFA" },
        "stat-value": { color: "#FAFAFA" },
        "stat-value-mid": { color: "#FAFAFA" },
        "stat-value-small": { color: "#FAFAFA" },
        "stat-label": { color: "#A1A1AA" },
        quote: { color: "#FAFAFA" },
        "quote-accent": { color: "#60A5FA" },
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
        "stat-display": { color: "#FAFAFA" },
        "stat-value": { color: "#FAFAFA" },
        "stat-value-mid": { color: "#FAFAFA" },
        "stat-value-small": { color: "#FAFAFA" },
        "stat-label": { color: "#DBEAFE" },
        quote: { color: "#FAFAFA" },
        "quote-accent": { color: "#FAFAFA" },
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
// CORPORATE_MODERN — restrained institutional system for enterprise SaaS,
// financial services, consulting, board decks. Serif-based (Source Serif
// 4 + IBM Plex Mono) for a "white paper / annual report" register that's
// visibly distinct from EDITORIAL_WARM's warm Playfair prospectus feel
// and from TECHNO_BOLD's geometric sans. True neutral grays (Tailwind
// zinc palette — no blue tint anywhere). The "signature move" is
// emphasis through WEIGHT only on the hero-accent line — no italic, no
// color shift — because corporate decks read slant as informal and read
// color accents as marketing. Generous letter-spacing on chrome,
// modest weights overall.
// ---------------------------------------------------------------------------

const CORPORATE_SERIF = "Source Serif 4";
const PLEX_MONO = "IBM Plex Mono";

export const CORPORATE_MODERN: DesignSystem = {
  name: "corporate-modern",
  useFor:
    "enterprise B2B, financial services, professional services, board decks — restrained institutional voice with serif body and mono chrome (white-paper register); brand-color accent appears only on chrome (eyebrows, markers, accent-bar) so the headline stays monochrome.",
  defaultBackground: "#FFFFFF",
  // Conservative accent slot: brand color shows up on CHROME ONLY
  // (eyebrows, markers, accent-bar, accent-surface bg). Hero / body /
  // stats stay monochrome zinc — that's the "weight-only emphasis on
  // headline" signature. Default is corporate trust blue (#1E40AF); the
  // LLM overrides via plan_deck.accent for fintech, healthcare,
  // sustainability, etc.
  accent: { base: "#1E40AF", onDark: "#60A5FA" },
  composition: {
    preferAsymmetric: false,
    preferDarkVariants: false,
  },
  styles: {
    // Hero: semibold (not extra-bold like techno-bold, not regular like
    // editorial-warm). Tight letter-spacing. Reads as structured, not
    // bombastic.
    hero: {
      fontFamily: CORPORATE_SERIF,
      fontSize: 6.0,
      fontWeight: 600,
      color: "#18181B",
      lineHeight: 1.05,
      letterSpacing: -0.02,
      align: "left",
    },
    // Hero-accent: emphasis through WEIGHT only — same zinc-900 as
    // hero, but bolder (700 vs 600). The corporate restraint move:
    // contrast through density, not color.
    "hero-accent": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 6.0,
      fontWeight: 700,
      color: "#18181B",
      lineHeight: 1.05,
      letterSpacing: -0.02,
      align: "left",
    },
    subtitle: {
      fontFamily: CORPORATE_SERIF,
      fontSize: 2.0,
      fontWeight: 500,
      color: "#52525B",
      lineHeight: 1.35,
      align: "left",
    },
    eyebrow: {
      fontFamily: PLEX_MONO,
      fontSize: 1.1,
      fontWeight: 500,
      color: "#1E40AF",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "left",
    },
    body: {
      fontFamily: CORPORATE_SERIF,
      fontSize: 1.6,
      fontWeight: 400,
      color: "#3F3F46",
      lineHeight: 1.55,
      align: "left",
    },
    bullets: {
      fontFamily: CORPORATE_SERIF,
      fontSize: 1.6,
      fontWeight: 400,
      color: "#3F3F46",
      lineHeight: 1.6,
      align: "left",
    },
    // Display stats — semibold (not extra-bold). Letter-spacing
    // tightened slightly for cohesion with hero.
    "stat-display": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 14,
      fontWeight: 600,
      color: "#18181B",
      lineHeight: 1.0,
      letterSpacing: -0.03,
      align: "left",
    },
    "stat-value": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 8.5,
      fontWeight: 600,
      color: "#18181B",
      lineHeight: 1.0,
      letterSpacing: -0.02,
      align: "left",
    },
    "stat-value-mid": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 5.5,
      fontWeight: 600,
      color: "#18181B",
      lineHeight: 1.0,
      letterSpacing: -0.02,
      align: "left",
    },
    "stat-value-small": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 3.5,
      fontWeight: 600,
      color: "#18181B",
      lineHeight: 1.0,
      align: "left",
    },
    "stat-label": {
      fontFamily: PLEX_MONO,
      fontSize: 1.05,
      fontWeight: 500,
      color: "#71717A",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "left",
    },
    quote: {
      fontFamily: CORPORATE_SERIF,
      fontSize: 3.5,
      fontWeight: 500,
      color: "#18181B",
      lineHeight: 1.3,
      align: "left",
    },
    "quote-accent": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 3.5,
      fontWeight: 500,
      color: "#3F3F46",
      lineHeight: 1.3,
      align: "left",
    },
    attribution: {
      fontFamily: CORPORATE_SERIF,
      fontSize: 1.4,
      fontWeight: 500,
      color: "#18181B",
      align: "left",
    },
    "card-eyebrow": {
      fontFamily: PLEX_MONO,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#1E40AF",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "left",
    },
    "card-title": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 2.0,
      fontWeight: 600,
      color: "#18181B",
      lineHeight: 1.25,
      align: "left",
    },
    "card-body": {
      fontFamily: CORPORATE_SERIF,
      fontSize: 1.45,
      fontWeight: 400,
      color: "#52525B",
      lineHeight: 1.55,
      align: "left",
    },
    "chrome-left": {
      fontFamily: PLEX_MONO,
      fontSize: 1.1,
      fontWeight: 500,
      color: "#3F3F46",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "left",
    },
    "chrome-right": {
      fontFamily: PLEX_MONO,
      fontSize: 1.05,
      fontWeight: 500,
      color: "#71717A",
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "right",
    },
    footer: {
      fontFamily: PLEX_MONO,
      fontSize: 0.85,
      fontWeight: 500,
      color: "#71717A",
      textTransform: "uppercase",
      letterSpacing: 0.1,
      align: "left",
    },
    // Shape roles — fontSize ignored; only color matters. Mid-zinc
    // for decorative accents — readable on white, doesn't compete with
    // text. Pure-gray accent is the corporate identity move.
    "card-surface": { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#FAFAFA" },
    divider: { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#E4E4E7" },
    "accent-bar": { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#1E40AF" },
    marker: { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#1E40AF" },
    image: { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#F4F4F5" },
  },
  // Surface treatments — corporate dark goes zinc-900; accent surface
  // is zinc-800 (a deep neutral, not a brand-color block). Emphasis
  // stays monochrome on both.
  surfaces: {
    dark: {
      background: "#18181B",
      overrides: {
        hero: { color: "#F4F4F5" },
        // hero-accent matches hero color — emphasis comes from the
        // role's 700 weight (vs hero's 600). Stays monochrome on dark
        // surfaces too; brand color shows up on chrome only.
        "hero-accent": { color: "#F4F4F5" },
        subtitle: { color: "#A1A1AA" },
        eyebrow: { color: "#60A5FA" },
        body: { color: "#D4D4D8" },
        bullets: { color: "#D4D4D8" },
        "stat-display": { color: "#F4F4F5" },
        "stat-value": { color: "#F4F4F5" },
        "stat-value-mid": { color: "#F4F4F5" },
        "stat-value-small": { color: "#F4F4F5" },
        "stat-label": { color: "#A1A1AA" },
        quote: { color: "#F4F4F5" },
        "quote-accent": { color: "#F4F4F5" },
        attribution: { color: "#F4F4F5" },
        "card-eyebrow": { color: "#60A5FA" },
        "card-title": { color: "#F4F4F5" },
        "card-body": { color: "#A1A1AA" },
        "chrome-left": { color: "#F4F4F5" },
        "chrome-right": { color: "#A1A1AA" },
        footer: { color: "#71717A" },
        divider: { color: "#27272A" },
        "accent-bar": { color: "#60A5FA" },
        marker: { color: "#60A5FA" },
      },
    },
    accent: {
      // Accent surface = brand block. Background is the accent color;
      // text reads cream/white for contrast. The accent override (via
      // applyAccent) swaps this background and the eyebrow/marker
      // chrome together, keeping the system coherent.
      background: "#1E40AF",
      overrides: {
        hero: { color: "#FFFFFF" },
        "hero-accent": { color: "#FFFFFF" },
        subtitle: { color: "#DBEAFE" },
        eyebrow: { color: "#FFFFFF" },
        body: { color: "#DBEAFE" },
        bullets: { color: "#DBEAFE" },
        "stat-display": { color: "#FFFFFF" },
        "stat-value": { color: "#FFFFFF" },
        "stat-value-mid": { color: "#FFFFFF" },
        "stat-value-small": { color: "#FFFFFF" },
        "stat-label": { color: "#DBEAFE" },
        quote: { color: "#FFFFFF" },
        "quote-accent": { color: "#FFFFFF" },
        attribution: { color: "#FFFFFF" },
        "card-eyebrow": { color: "#FFFFFF" },
        "card-title": { color: "#FFFFFF" },
        "card-body": { color: "#DBEAFE" },
        footer: { color: "#DBEAFE" },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// PLAYFUL_CREATIVE — cozy/friendly register for family, lifestyle,
// classroom, cookbook, parenting, kid-product, and any deck that wants
// to feel warm and human rather than corporate or austere. The whole
// system is one rounded humanist sans (Nunito) — soft terminals, gentle
// counters, no display flourish. Emphasis is a single warm-orange
// accent on hero-accent + chrome. No poster weights, no italic, no
// display switch: cozy is the absence of those moves. Peach card
// surfaces and a butter-cream slide background reinforce the warm
// register. Distinct from MINIMAL_SWISS (austere/poster) by every
// axis — softer font, softer weights, softer warm palette — and from
// the other systems by being the only one that actively avoids
// emphasis tricks.
// ---------------------------------------------------------------------------

const COZY_SANS = "Nunito";
const COZY_ACCENT = "#EA580C"; // orange-600, warm friendly
const COZY_TEXT = "#1C1917"; // stone-900, warm dark
const COZY_BODY = "#57534E"; // stone-600, warm gray for body
const COZY_MUTED = "#78716C"; // stone-500, warm muted

export const PLAYFUL_CREATIVE: DesignSystem = {
  name: "playful-creative",
  useFor:
    "family, classroom, cookbook, lifestyle, parenting, kid-product, and any informal/cozy deck — single rounded humanist sans with a warm-orange accent; soft and friendly, never austere.",
  defaultBackground: "#FFFBEB",
  accent: { base: "#EA580C", onDark: "#FB923C" },
  composition: {
    preferAsymmetric: false,
    preferDarkVariants: false,
  },
  styles: {
    // Hero: Nunito Bold (700). Heavy enough to read at a distance,
    // soft enough not to shout. No extreme weights — cozy is gentle.
    hero: {
      fontFamily: COZY_SANS,
      fontSize: 6.0,
      fontWeight: 700,
      color: COZY_TEXT,
      lineHeight: 1.1,
      letterSpacing: -0.015,
      align: "left",
    },
    // Hero-accent: same Nunito, same weight, warm-orange. Single
    // color-only emphasis at matched weight. The accent shouldn't
    // dominate — it sits inside the friendly headline as a warm spot.
    "hero-accent": {
      fontFamily: COZY_SANS,
      fontSize: 6.0,
      fontWeight: 700,
      color: COZY_ACCENT,
      lineHeight: 1.1,
      letterSpacing: -0.015,
      align: "left",
    },
    subtitle: {
      fontFamily: COZY_SANS,
      fontSize: 2.0,
      fontWeight: 500,
      color: COZY_BODY,
      lineHeight: 1.45,
      align: "left",
    },
    eyebrow: {
      fontFamily: COZY_SANS,
      fontSize: 1.1,
      fontWeight: 600,
      color: COZY_ACCENT,
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    body: {
      fontFamily: COZY_SANS,
      fontSize: 1.6,
      fontWeight: 400,
      color: COZY_BODY,
      lineHeight: 1.65,
      align: "left",
    },
    bullets: {
      fontFamily: COZY_SANS,
      fontSize: 1.6,
      fontWeight: 400,
      color: COZY_BODY,
      lineHeight: 1.7,
      align: "left",
    },
    "stat-display": {
      fontFamily: COZY_SANS,
      fontSize: 14,
      fontWeight: 700,
      color: COZY_TEXT,
      lineHeight: 1.0,
      letterSpacing: -0.025,
      align: "left",
    },
    "stat-value": {
      fontFamily: COZY_SANS,
      fontSize: 8.5,
      fontWeight: 700,
      color: COZY_TEXT,
      lineHeight: 1.0,
      letterSpacing: -0.025,
      align: "left",
    },
    "stat-value-mid": {
      fontFamily: COZY_SANS,
      fontSize: 5.0,
      fontWeight: 700,
      color: COZY_TEXT,
      lineHeight: 1.0,
      letterSpacing: -0.015,
      align: "left",
    },
    "stat-value-small": {
      fontFamily: COZY_SANS,
      fontSize: 3.4,
      fontWeight: 700,
      color: COZY_TEXT,
      lineHeight: 1.0,
      align: "left",
    },
    "stat-label": {
      fontFamily: COZY_SANS,
      fontSize: 1.05,
      fontWeight: 600,
      color: COZY_MUTED,
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    quote: {
      fontFamily: COZY_SANS,
      fontSize: 3.4,
      fontWeight: 600,
      color: COZY_TEXT,
      lineHeight: 1.35,
      align: "left",
    },
    "quote-accent": {
      fontFamily: COZY_SANS,
      fontSize: 3.4,
      fontWeight: 600,
      color: COZY_ACCENT,
      lineHeight: 1.35,
      align: "left",
    },
    attribution: {
      fontFamily: COZY_SANS,
      fontSize: 1.4,
      fontWeight: 600,
      color: COZY_TEXT,
      align: "left",
    },
    "card-eyebrow": {
      fontFamily: COZY_SANS,
      fontSize: 1.0,
      fontWeight: 600,
      color: COZY_ACCENT,
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    "card-title": {
      fontFamily: COZY_SANS,
      fontSize: 2.0,
      fontWeight: 700,
      color: COZY_TEXT,
      lineHeight: 1.25,
      align: "left",
    },
    "card-body": {
      fontFamily: COZY_SANS,
      fontSize: 1.45,
      fontWeight: 400,
      color: COZY_BODY,
      lineHeight: 1.6,
      align: "left",
    },
    "chrome-left": {
      fontFamily: COZY_SANS,
      fontSize: 1.1,
      fontWeight: 600,
      color: COZY_TEXT,
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    "chrome-right": {
      fontFamily: COZY_SANS,
      fontSize: 1.05,
      fontWeight: 600,
      color: COZY_MUTED,
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "right",
    },
    footer: {
      fontFamily: COZY_SANS,
      fontSize: 0.85,
      fontWeight: 600,
      color: COZY_MUTED,
      textTransform: "uppercase",
      letterSpacing: 0.12,
      align: "left",
    },
    // Shape roles — soft peach card surface (orange-100) for the cozy
    // tactile feel. Marker and accent-bar pick up the warm-orange
    // accent so decorative shapes carry the same identity as type.
    "card-surface": { fontFamily: COZY_SANS, fontSize: 0, color: "#FFEDD5" },
    divider: { fontFamily: COZY_SANS, fontSize: 0, color: "#E7E5E4" },
    "accent-bar": { fontFamily: COZY_SANS, fontSize: 0, color: COZY_ACCENT },
    marker: { fontFamily: COZY_SANS, fontSize: 0, color: COZY_ACCENT },
    image: { fontFamily: COZY_SANS, fontSize: 0, color: "#FFEDD5" },
  },
  surfaces: {
    dark: {
      // Warm-dark stone (not pure black) — cozy doesn't go austere.
      background: "#292524",
      overrides: {
        hero: { color: "#FAFAF9" },
        "hero-accent": { color: "#FB923C" },
        subtitle: { color: "#D6D3D1" },
        eyebrow: { color: "#FB923C" },
        body: { color: "#D6D3D1" },
        bullets: { color: "#D6D3D1" },
        "stat-display": { color: "#FAFAF9" },
        "stat-value": { color: "#FAFAF9" },
        "stat-value-mid": { color: "#FAFAF9" },
        "stat-value-small": { color: "#FAFAF9" },
        "stat-label": { color: "#D6D3D1" },
        quote: { color: "#FAFAF9" },
        "quote-accent": { color: "#FB923C" },
        attribution: { color: "#FAFAF9" },
        "card-eyebrow": { color: "#FB923C" },
        "card-title": { color: "#FAFAF9" },
        "card-body": { color: "#D6D3D1" },
        "chrome-left": { color: "#FAFAF9" },
        "chrome-right": { color: "#A8A29E" },
        footer: { color: "#A8A29E" },
        divider: { color: "#44403C" },
      },
    },
    accent: {
      // Warm-orange block for brand-color moments. Text reads cream.
      background: COZY_ACCENT,
      overrides: {
        hero: { color: "#FFFBEB" },
        "hero-accent": { color: "#FFFBEB" },
        subtitle: { color: "#FFEDD5" },
        eyebrow: { color: "#FFFBEB" },
        body: { color: "#FFEDD5" },
        bullets: { color: "#FFEDD5" },
        "stat-display": { color: "#FFFBEB" },
        "stat-value": { color: "#FFFBEB" },
        "stat-value-mid": { color: "#FFFBEB" },
        "stat-value-small": { color: "#FFFBEB" },
        "stat-label": { color: "#FFEDD5" },
        quote: { color: "#FFFBEB" },
        "quote-accent": { color: "#FFFBEB" },
        attribution: { color: "#FFFBEB" },
        "card-eyebrow": { color: "#FFFBEB" },
        "card-title": { color: "#FFFBEB" },
        "card-body": { color: "#FFEDD5" },
        footer: { color: "#FFEDD5" },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// MINIMAL_SWISS — International Style / Müller-Brockmann register for
// design-conscious decks: research showcases, design portfolios, museum/
// gallery, architecture firms, premium-magazine partnerships. The
// signature move is the classic Swiss-poster treatment: the WHOLE hero
// is heavy (Work Sans 900) and ONE word reads in saturated red — color
// emphasis at matched weight, where techno uses color at matched weight
// in *blue*, corporate uses weight-only, editorial uses italic, and
// playful uses script. Pure-white slide, pure-black text. No mono
// chrome (Work Sans throughout) — the system reads as a single
// typographic voice, not a stack of registers.
// ---------------------------------------------------------------------------

const SWISS_SANS = "Work Sans";

export const MINIMAL_SWISS: DesignSystem = {
  name: "minimal-swiss",
  useFor:
    "design portfolios, architecture, museum/gallery, research showcases, premium editorial — International Style discipline: heavy single sans throughout, pure black-on-white, one red word per headline as the canonical Swiss-poster accent.",
  defaultBackground: "#FFFFFF",
  accent: { base: "#DC2626", onDark: "#EF4444" },
  composition: {
    preferAsymmetric: false,
    preferDarkVariants: false,
  },
  styles: {
    // Hero: Work Sans BLACK (900). The whole title reads as one
    // poster-weight block — no whisper-shout contrast. Emphasis lives
    // in color, not weight.
    hero: {
      fontFamily: SWISS_SANS,
      fontSize: 6.0,
      fontWeight: 900,
      color: "#0A0A0A",
      lineHeight: 1.05,
      letterSpacing: -0.02,
      align: "left",
    },
    // Hero-accent: same family, same size, same heavy weight, swiss
    // red. The iconic "one red word in a black headline" move.
    "hero-accent": {
      fontFamily: SWISS_SANS,
      fontSize: 6.0,
      fontWeight: 900,
      color: "#DC2626",
      lineHeight: 1.05,
      letterSpacing: -0.02,
      align: "left",
    },
    subtitle: {
      fontFamily: SWISS_SANS,
      fontSize: 2.0,
      fontWeight: 400,
      color: "#404040",
      lineHeight: 1.35,
      align: "left",
    },
    eyebrow: {
      fontFamily: SWISS_SANS,
      fontSize: 1.1,
      fontWeight: 500,
      color: "#DC2626",
      textTransform: "uppercase",
      letterSpacing: 0.18,
      align: "left",
    },
    body: {
      fontFamily: SWISS_SANS,
      fontSize: 1.6,
      fontWeight: 400,
      color: "#404040",
      lineHeight: 1.6,
      align: "left",
    },
    bullets: {
      fontFamily: SWISS_SANS,
      fontSize: 1.6,
      fontWeight: 400,
      color: "#404040",
      lineHeight: 1.65,
      align: "left",
    },
    // Display stats: pure black, weight 900. The headline numbers are
    // the swiss-poster moment — uncompromising weight.
    "stat-display": {
      fontFamily: SWISS_SANS,
      fontSize: 14,
      fontWeight: 900,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.04,
      align: "left",
    },
    "stat-value": {
      fontFamily: SWISS_SANS,
      fontSize: 9.0,
      fontWeight: 900,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.03,
      align: "left",
    },
    "stat-value-mid": {
      fontFamily: SWISS_SANS,
      fontSize: 5.0,
      fontWeight: 900,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.02,
      align: "left",
    },
    "stat-value-small": {
      fontFamily: SWISS_SANS,
      fontSize: 3.4,
      fontWeight: 900,
      color: "#0A0A0A",
      lineHeight: 1.0,
      letterSpacing: -0.02,
      align: "left",
    },
    "stat-label": {
      fontFamily: SWISS_SANS,
      fontSize: 1.05,
      fontWeight: 500,
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: 0.16,
      align: "left",
    },
    quote: {
      fontFamily: SWISS_SANS,
      fontSize: 3.4,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 1.3,
      align: "left",
    },
    // Quote-accent: matched weight, swiss red — same color-emphasis
    // move as hero/hero-accent.
    "quote-accent": {
      fontFamily: SWISS_SANS,
      fontSize: 3.4,
      fontWeight: 700,
      color: "#DC2626",
      lineHeight: 1.3,
      align: "left",
    },
    attribution: {
      fontFamily: SWISS_SANS,
      fontSize: 1.4,
      fontWeight: 500,
      color: "#0A0A0A",
      align: "left",
    },
    "card-eyebrow": {
      fontFamily: SWISS_SANS,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#DC2626",
      textTransform: "uppercase",
      letterSpacing: 0.16,
      align: "left",
    },
    "card-title": {
      fontFamily: SWISS_SANS,
      fontSize: 2.0,
      fontWeight: 700,
      color: "#0A0A0A",
      lineHeight: 1.2,
      letterSpacing: -0.02,
      align: "left",
    },
    "card-body": {
      fontFamily: SWISS_SANS,
      fontSize: 1.45,
      fontWeight: 400,
      color: "#404040",
      lineHeight: 1.55,
      align: "left",
    },
    "chrome-left": {
      fontFamily: SWISS_SANS,
      fontSize: 1.1,
      fontWeight: 500,
      color: "#0A0A0A",
      textTransform: "uppercase",
      letterSpacing: 0.18,
      align: "left",
    },
    "chrome-right": {
      fontFamily: SWISS_SANS,
      fontSize: 1.05,
      fontWeight: 500,
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: 0.18,
      align: "right",
    },
    footer: {
      fontFamily: SWISS_SANS,
      fontSize: 0.85,
      fontWeight: 500,
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: 0.14,
      align: "left",
    },
    // Shape roles — Swiss red on functional accents (markers, bars).
    // Card surfaces are a thin gray (no warm tint).
    "card-surface": { fontFamily: SWISS_SANS, fontSize: 0, color: "#F5F5F5" },
    divider: { fontFamily: SWISS_SANS, fontSize: 0, color: "#E5E5E5" },
    "accent-bar": { fontFamily: SWISS_SANS, fontSize: 0, color: "#DC2626" },
    marker: { fontFamily: SWISS_SANS, fontSize: 0, color: "#DC2626" },
    image: { fontFamily: SWISS_SANS, fontSize: 0, color: "#F5F5F5" },
  },
  // Surfaces — dark inverts to pure black; accent goes saturated red
  // for poster moments (manifesto slides, statement covers).
  surfaces: {
    dark: {
      background: "#0A0A0A",
      overrides: {
        hero: { color: "#FAFAFA" },
        // Accent stays red — lighter shade (red-400) for legibility
        // on the black surface.
        "hero-accent": { color: "#EF4444" },
        subtitle: { color: "#A3A3A3" },
        eyebrow: { color: "#EF4444" },
        body: { color: "#A3A3A3" },
        bullets: { color: "#A3A3A3" },
        "stat-display": { color: "#FAFAFA" },
        "stat-value": { color: "#FAFAFA" },
        "stat-value-mid": { color: "#FAFAFA" },
        "stat-value-small": { color: "#FAFAFA" },
        "stat-label": { color: "#A3A3A3" },
        quote: { color: "#FAFAFA" },
        "quote-accent": { color: "#EF4444" },
        attribution: { color: "#FAFAFA" },
        "card-eyebrow": { color: "#EF4444" },
        "card-title": { color: "#FAFAFA" },
        "card-body": { color: "#A3A3A3" },
        "chrome-left": { color: "#FAFAFA" },
        "chrome-right": { color: "#A3A3A3" },
        footer: { color: "#737373" },
        divider: { color: "#262626" },
      },
    },
    accent: {
      // Pure swiss red block. Text becomes off-white; the red-on-red
      // accent collapses, so accent line goes cream like the hero.
      background: "#DC2626",
      overrides: {
        hero: { color: "#FAFAFA" },
        "hero-accent": { color: "#FAFAFA" },
        subtitle: { color: "#FECACA" },
        eyebrow: { color: "#FAFAFA" },
        body: { color: "#FECACA" },
        bullets: { color: "#FECACA" },
        "stat-display": { color: "#FAFAFA" },
        "stat-value": { color: "#FAFAFA" },
        "stat-value-mid": { color: "#FAFAFA" },
        "stat-value-small": { color: "#FAFAFA" },
        "stat-label": { color: "#FECACA" },
        quote: { color: "#FAFAFA" },
        "quote-accent": { color: "#FAFAFA" },
        attribution: { color: "#FAFAFA" },
        "card-eyebrow": { color: "#FAFAFA" },
        "card-title": { color: "#FAFAFA" },
        "card-body": { color: "#FECACA" },
        footer: { color: "#FECACA" },
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
      defaultText: "ATLAS ROASTERS",
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
      defaultText: "WHOLESALE PARTNER PACKET",
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
      defaultText: "Beans from",
    },
    {
      id: "hero_2",
      role: "hero-accent",
      x: 6,
      y: 50,
      w: 40,
      h: 14,
      fit: "single-line",
      defaultText: "10 farms,",
    },
    {
      id: "hero_3",
      role: "hero",
      x: 6,
      y: 62,
      w: 40,
      h: 14,
      fit: "single-line",
      defaultText: "your bar.",
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
        "Direct-trade espresso, roasted to your dial. Studio, café, and hotel formats.",
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
      defaultText: "CONFIDENTIAL · WHOLESALE PARTNERS ONLY · 2026 PRICING",
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
// COVER_STATEMENT — image-less cover for decks that lead with a punchy
// statement (dev tools, infra, B2B SaaS). Two-line hero spans the full
// width, body sits under it at ~60% width, and a 4-column footer rail
// surfaces the deck's headline facts ("RAISING / STAGE / BENCHMARK / DECK")
// at a glance. Sibling to cover-split-portrait — pick whichever fits the
// brand: image-led narrative vs text-led declaration.
// ---------------------------------------------------------------------------

export const COVER_STATEMENT: LayoutComposition = {
  name: "cover-statement",
  description:
    "Dark text-only cover for statement-led decks (dev tools, B2B, infra). Two-line hero across the full canvas — regular line + accent line — followed by a 60%-wide body description and a four-column footer rail that surfaces the deck's headline facts. No image slot.",
  surface: "dark",
  elements: [
    // Top chrome — brand on the left, deck meta on the right.
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "AEGIS",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 64,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      align: "right",
      defaultText: "SERIES B · STRATEGIC PREVIEW · 2026",
    },
    // Hero — two stacked lines, full width. Box height is fontSize × ~1.2
    // (just enough to clear descenders) so the two lines read as one
    // tight typographic unit rather than two paragraphs.
    {
      id: "hero_1",
      role: "hero",
      x: 6,
      y: 36,
      w: 88,
      h: 14,
      fit: "single-line",
      defaultText: "Detect threats,",
    },
    {
      id: "hero_2",
      role: "hero-accent",
      x: 6,
      y: 48,
      w: 88,
      h: 14,
      fit: "single-line",
      defaultText: "not noise.",
    },
    // Body — under the hero, ~60% width so the line breaks land naturally
    // around 60-65 chars per line. Box height ≈ 3 lines at body size.
    {
      id: "body",
      role: "body",
      x: 6,
      y: 68,
      w: 60,
      h: 16,
      fit: "multi-line",
      defaultText:
        "Aegis is the SOC platform that fuses telemetry, ML triage, and human review into a single response surface — for security teams that can't afford to chase false positives.",
    },
    // Footer rail — four equal-width left-aligned columns of label/value
    // pairs. Labels use stat-label (mono caps, muted); values use
    // card-title (small + bold + primary). All four slots are generic —
    // the model picks any short key facts that summarise the deck.
    {
      id: "stat_1_label",
      role: "stat-label",
      x: 6,
      y: 88,
      w: 20,
      h: 2.5,
      fit: "single-line",
      defaultText: "RAISING",
    },
    {
      id: "stat_1_value",
      role: "card-title",
      x: 6,
      y: 91,
      w: 20,
      h: 8,
      fit: "single-line",
      defaultText: "$25M Series B",
    },
    {
      id: "stat_2_label",
      role: "stat-label",
      x: 28,
      y: 88,
      w: 20,
      h: 2.5,
      fit: "single-line",
      defaultText: "STAGE",
    },
    {
      id: "stat_2_value",
      role: "card-title",
      x: 28,
      y: 91,
      w: 20,
      h: 8,
      fit: "single-line",
      defaultText: "Post-revenue",
    },
    {
      id: "stat_3_label",
      role: "stat-label",
      x: 50,
      y: 88,
      w: 20,
      h: 2.5,
      fit: "single-line",
      defaultText: "COVERAGE",
    },
    {
      id: "stat_3_value",
      role: "card-title",
      x: 50,
      y: 91,
      w: 20,
      h: 8,
      fit: "single-line",
      defaultText: "300+ techniques",
    },
    {
      id: "stat_4_label",
      role: "stat-label",
      x: 72,
      y: 88,
      w: 22,
      h: 2.5,
      fit: "single-line",
      defaultText: "WEBSITE",
    },
    {
      id: "stat_4_value",
      role: "card-title",
      x: 72,
      y: 91,
      w: 22,
      h: 8,
      fit: "single-line",
      defaultText: "aegis.run",
    },
  ],
};

// ---------------------------------------------------------------------------
// PROBLEM_EVIDENCE — dark, stat-led problem statement. Wrapped multi-line
// hero with an inline accent number, source citation directly under the
// hero, and a 3-card row at the bottom where each card carries an
// eyebrow / big stat / supporting body / source citation. The structure
// signals "research-backed problem framing" — useful for investor decks
// where the problem slide needs cited evidence, not just a vibe.
// ---------------------------------------------------------------------------

/**
 * One stat card with eyebrow + big stat + body + source-citation footer.
 * Used by PROBLEM_EVIDENCE for the bottom row. Inner padding 2% per side.
 */
function statCardCited(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  eyebrow: string,
  stat: string,
  body: string,
  source: string
): CompositionElement[] {
  const px = 2;
  return [
    { id: `${id}_surface`, role: "card-surface", surface: "default", x, y, w, h },
    {
      id: `${id}_eyebrow`,
      role: "card-eyebrow",
      surface: "default",
      x: x + px,
      y: y + 2,
      w: w - 2 * px,
      h: 3,
      fit: "single-line",
      defaultText: eyebrow,
    },
    {
      id: `${id}_stat`,
      role: "stat-value-mid",
      surface: "default",
      x: x + px,
      y: y + 5.5,
      w: w - 2 * px,
      h: 12,
      fit: "single-line",
      defaultText: stat,
    },
    {
      id: `${id}_body`,
      role: "card-body",
      surface: "default",
      x: x + px,
      y: y + 18,
      w: w - 2 * px,
      h: 13,
      fit: "multi-line",
      defaultText: body,
    },
    {
      id: `${id}_source`,
      role: "stat-label",
      surface: "default",
      x: x + px,
      y: y + h - 4,
      w: w - 2 * px,
      h: 3,
      fit: "single-line",
      defaultText: source,
    },
  ];
}

export const PROBLEM_EVIDENCE: LayoutComposition = {
  name: "problem-evidence",
  description:
    "Dark research-backed problem slide. Section chrome top-left, a 3-line wrapped hero with an inline accent stat (a number embedded in the sentence), and a source-citation line directly under the hero. Three stat cards below — each with eyebrow / big stat / supporting body / source citation. For investor/credible problem framing where evidence has to carry the slide.",
  surface: "dark",
  elements: [
    // Section chrome (top-left only — this composition uses a bottom-left
    // brand chrome instead of the usual top-right page counter).
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "01 / PROBLEM",
    },
    // Multi-line hero — wraps naturally; the `*marker*` syntax around
    // the number renders it as an inline italic-accent span ("62%" pops
    // in the accent color). The whole sentence carries the headline stat
    // rather than parking it in a separate display block.
    {
      id: "hero",
      role: "hero",
      x: 6,
      y: 13,
      w: 88,
      h: 37,
      fit: "multi-line",
      defaultText:
        "Engineering orgs spend *62%* of capacity on work that isn't shipping.",
    },
    // Source citation under the hero (mono uppercase, muted). The
    // research-credibility signal — distinguishes this from a marketing
    // pull-quote.
    {
      id: "hero_source",
      role: "stat-label",
      x: 6,
      y: 52,
      w: 88,
      h: 3,
      fit: "single-line",
      defaultText: "STRIPE / HARRIS POLL DEVELOPER COEFFICIENT · N=1,003 · RE-VALIDATED 2024",
    },
    // Three evidence cards along the bottom. Each carries its own stat,
    // a one-sentence interpretation, and a source citation footer.
    ...statCardCited(
      "card_1",
      6,
      58,
      28,
      34,
      "THE TOIL",
      "41%",
      "Of senior eng capacity goes to bug triage and migration tickets.",
      "GITHUB OCTOVERSE 2024"
    ),
    ...statCardCited(
      "card_2",
      36,
      58,
      28,
      34,
      "THE GAP",
      "49%",
      "Of issues stay open past 30 days — well-scoped, just under-prioritised.",
      "LINEARB ENG. BENCHMARKS 2024"
    ),
    ...statCardCited(
      "card_3",
      66,
      58,
      28,
      34,
      "THE COST",
      "$85B",
      "Annual U.S. eng payroll spent on work an autonomous agent could complete.",
      "BLS OEWS 2024 · INTERNAL MODEL"
    ),
    // Bottom-left brand chrome — small mono muted, anchors the deck
    // identity at the page edge rather than at the top.
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 95,
      w: 60,
      h: 3,
      fit: "single-line",
      defaultText: "FORGE AI · SERIES A · 02 / 16",
    },
  ],
};

// ---------------------------------------------------------------------------
// HEADLINE_NUMBER — the slide is ONE massive number. Used for "The Ask"
// raises, big market-size openers, milestone reveals — anywhere the
// single headline figure should carry the whole slide. Hairline + 3-column
// footer surfaces supporting terms (structure / board / timeline, or
// whatever metadata accompanies the figure). Sibling to cover-statement:
// same chrome and footer rhythm, but a stat-display where the hero text
// would go.
// ---------------------------------------------------------------------------

export const HEADLINE_NUMBER: LayoutComposition = {
  name: "headline-number",
  description:
    "Dark slide whose entire focal point is one massive number rendered in the stat-display role (the raise amount, the market size, a milestone). Subhead under the number, divider, and a 3-column footer of label/value pairs at the bottom — for deal terms, milestones, or metadata that contextualises the headline.",
  surface: "dark",
  elements: [
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "12 / THE ASK",
    },
    // The slide's whole point — one massive number. stat-display is
    // ~2× stat-value; box height clears the descender for the
    // canvas-percent-scaled font in both systems.
    {
      id: "stat",
      role: "stat-display",
      x: 6,
      y: 28,
      w: 88,
      h: 29,
      fit: "single-line",
      defaultText: "$40M",
    },
    // Subhead — two-line subtitle directly under the number, ~55% width
    // so it reads as one coherent thought rather than running canvas-wide.
    {
      id: "subhead",
      role: "subtitle",
      x: 6,
      y: 62,
      w: 62,
      h: 18,
      fit: "multi-line",
      defaultText:
        "Series A · led by an AI-native fund with deep dev-tools distribution.",
    },
    // Footer divider sets the bottom rail apart from the upper block.
    {
      id: "footer_rule",
      role: "divider",
      x: 6,
      y: 84,
      w: 88,
      h: 0,
    },
    // Three-column footer of label/value pairs. Generic slots — the
    // model picks any three terms that contextualise the headline
    // number (raise structure, board composition, timeline, etc).
    {
      id: "col_1_label",
      role: "stat-label",
      x: 6,
      y: 86,
      w: 28,
      h: 2.5,
      fit: "single-line",
      defaultText: "STRUCTURE",
    },
    {
      id: "col_1_value",
      role: "body",
      x: 6,
      y: 89,
      w: 28,
      h: 6,
      fit: "single-line",
      defaultText: "$30M primary · $10M secondary",
    },
    {
      id: "col_2_label",
      role: "stat-label",
      x: 36,
      y: 86,
      w: 28,
      h: 2.5,
      fit: "single-line",
      defaultText: "BOARD",
    },
    {
      id: "col_2_value",
      role: "body",
      x: 36,
      y: 89,
      w: 28,
      h: 6,
      fit: "single-line",
      defaultText: "1 lead · 2 founder · 1 indep",
    },
    {
      id: "col_3_label",
      role: "stat-label",
      x: 66,
      y: 86,
      w: 28,
      h: 2.5,
      fit: "single-line",
      defaultText: "TIMELINE",
    },
    {
      id: "col_3_value",
      role: "body",
      x: 66,
      y: 89,
      w: 28,
      h: 6,
      fit: "single-line",
      defaultText: "Target: *May 30, 2026*",
    },
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 96,
      w: 60,
      h: 3,
      fit: "single-line",
      defaultText: "FORGE AI · SERIES A · 14 / 16",
    },
  ],
};

// ---------------------------------------------------------------------------
// AGENDA — variable-row agenda / table of contents using the FlexRegion
// primitive. The model supplies N items (typically 3–8); each item is a
// row of [number, title, description, duration]. Demonstrates the
// composition system's flex-region capability: the row count adapts to
// content instead of being baked into the geometry.
// ---------------------------------------------------------------------------

export const AGENDA: LayoutComposition = {
  name: "agenda",
  description:
    "Light slide with a hero title and a variable-row agenda block. Each agenda item is a horizontal row carrying a sequence number, a title, a short description, and a duration. The flex region lets the model add or remove items by passing more or fewer entries — typical decks have 4–8 rows.",
  elements: [
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "PROJECT MERIDIAN · SC-04",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "02 / 12",
    },
    // Eyebrow above the hero — small accent label.
    {
      id: "eyebrow",
      role: "eyebrow",
      x: 6,
      y: 18,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "TODAY'S SESSION",
    },
    // Hero — single word ("Agenda.") on this archetype.
    {
      id: "hero",
      role: "hero",
      x: 6,
      y: 22,
      w: 40,
      h: 14,
      fit: "single-line",
      defaultText: "Agenda.",
    },
    // Body — 1-line description under the hero. Body role matches the
    // descriptive copy in every other composition (only HEADLINE_NUMBER
    // uses subtitle, which is a sibling-display archetype).
    {
      id: "body",
      role: "body",
      x: 6,
      y: 38,
      w: 70,
      h: 8,
      fit: "multi-line",
      defaultText: "30 mins presented · 15 mins Q&A.",
    },
    // Hairline separating the header block from the agenda rows.
    { id: "rows_rule", role: "divider", x: 6, y: 50, w: 88, h: 0 },
    // Variable-row agenda — the flex region. Each item is a horizontal
    // row of [number, title, description, duration]. Add or remove items
    // by passing more/fewer entries to defaultItems (or, at fill time, by
    // the model adding more `agenda_<index>_<slot>` slot ids).
    {
      kind: "flex-region",
      idPrefix: "agenda",
      x: 6,
      y: 52,
      w: 88,
      h: 42,
      layout: "column",
      // gap=0.75 — enough breathing room around each separator line
      // without the serif theme (taller line-metrics) pushing the
      // last row into the footer. Multiplied across 11 interleaved
      // flex children, so total inter-row spacing ≈ 11 × 4px.
      gap: 0.75,
      // Pack items at the top of the region rather than letting them
      // distribute across the full height — without this, each item
      // grows to ~region.h/N and overflows the region's bottom when N
      // is high enough.
      justify: "start",
      align: "stretch",
      // Hairline divider between every row, plus one after the last
      // row to close the table. Matches the editorial-agenda pattern.
      separator: true,
      itemLayout: "row",
      itemGap: 2,
      // Baseline alignment so the small mono number sits on the same
      // typographic line as the serif title, not centred on the row.
      itemAlign: "baseline",
      // Rels intentionally have no `h` — letting content lineHeight
      // drive each item's natural height. With baseline alignment, fixed
      // heights on sub-elements inflate the row (baseline shifts push
      // content down by the larger font's metrics + the box's bottom
      // padding), which made the agenda overflow into the footer.
      item: [
        {
          id: "number",
          role: "stat-label",
          w: 4,
          fit: "single-line",
        },
        {
          id: "title",
          role: "card-title",
          w: 38,
          fit: "single-line",
        },
        {
          id: "description",
          role: "body",
          w: 30,
          fit: "single-line",
        },
        {
          id: "duration",
          role: "stat-label",
          w: 8,
          fit: "single-line",
          align: "right",
        },
      ],
      defaultItems: [
        {
          number: "01",
          title: "Action tracker from SC-03",
          description: "Status of seven open actions",
          duration: "3 MIN",
        },
        {
          number: "02",
          title: "Programme burndown & health",
          description: "Heatmap by week × workstream",
          duration: "6 MIN",
        },
        {
          number: "03",
          title: "Three findings & what they mean",
          description: "Pricing leakage · S&OP · spans",
          duration: "9 MIN",
        },
        {
          number: "04",
          title: "Decision — pricing override",
          description: "Sponsor sign-off today",
          duration: "6 MIN",
        },
        {
          number: "05",
          title: "Risk register & escalation",
          description: "Two risks moving to sponsor",
          duration: "4 MIN",
        },
        {
          number: "06",
          title: "Next four weeks & SC-05 prep",
          description: "Closing prep · pre-read T-48h",
          duration: "2 MIN",
        },
      ],
    },
    // Footer chrome at the bottom-left.
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 96,
      w: 60,
      h: 3,
      fit: "single-line",
      defaultText: "METHOD ANCHOR · PMBOK V7 · STEERCO",
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
      defaultText: "08 / OPERATIONS",
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
      y: 16,
      w: 82,
      h: 14,
      fit: "single-line",
      defaultText: "Marketing & tech,",
    },
    {
      id: "hero_2",
      role: "hero-accent",
      x: 6,
      y: 28,
      w: 82,
      h: 14,
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
      "Unified POS + KDS + inventory + loyalty app + financial dashboard. One log-in, no per-seat fees."
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
// FOUNDER_QUOTE_PORTRAIT — light slide; image left, multi-line pull-quote
// right with one italic-accent line, attribution + role beneath, mono caption
// under the image. Exercises the `quote` / `quote-accent` roles in parallel
// to the hero / hero-accent pattern.
// ---------------------------------------------------------------------------

export const FOUNDER_QUOTE_PORTRAIT: LayoutComposition = {
  name: "founder-quote-portrait",
  description:
    "Light slide: portrait image on the left half, founder pull-quote on the right with a single italic-accent line in the middle, attribution + role beneath. Mono caption under the image.",
  elements: [
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 22,
      h: 3,
      fit: "single-line",
      defaultText: "01 / BRAND STORY",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "03 / 28",
    },
    // Image — left portrait, contained with cream margin around it.
    { id: "image", role: "image", x: 6, y: 14, w: 38, h: 70 },
    {
      id: "image_caption",
      role: "stat-label",
      x: 6,
      y: 86,
      w: 38,
      h: 3,
      fit: "single-line",
      defaultText: "ANNA KIM · FOUNDER & CEO · BERLIN STUDIO, 2024",
    },
    // Right column — eyebrow, multi-line quote, attribution
    {
      id: "eyebrow",
      role: "eyebrow",
      x: 50,
      y: 14,
      w: 44,
      h: 3,
      fit: "single-line",
      defaultText: "A LETTER FROM THE FOUNDER",
    },
    // Four-line quote: lines 1, 2, 4 regular; line 3 is the italic accent.
    // Each line gets its own slot — same pattern as the hero.
    {
      id: "quote_1",
      role: "quote",
      x: 50,
      y: 20,
      w: 44,
      h: 9,
      fit: "single-line",
      defaultText: "“We don’t sell scent.",
    },
    {
      id: "quote_2",
      role: "quote",
      x: 50,
      y: 29,
      w: 44,
      h: 9,
      fit: "single-line",
      defaultText: "We sell a calm",
    },
    {
      id: "quote_3",
      role: "quote-accent",
      x: 50,
      y: 38,
      w: 44,
      h: 9,
      fit: "single-line",
      defaultText: "that fits your shelf",
    },
    {
      id: "quote_4",
      role: "quote",
      x: 50,
      y: 47,
      w: 44,
      h: 9,
      fit: "single-line",
      defaultText: "and your weekday.”",
    },
    {
      id: "body",
      role: "body",
      x: 50,
      y: 58,
      w: 44,
      h: 18,
      fit: "multi-line",
      defaultText:
        "I spent ten years formulating fragrances for houses you've heard of. Lume is the first where the buyer is the only person I please.",
    },
    {
      id: "attribution",
      role: "attribution",
      x: 50,
      y: 83,
      w: 44,
      h: 4,
      fit: "single-line",
      defaultText: "— Anna Kim",
    },
    {
      id: "attribution_role",
      role: "stat-label",
      x: 50,
      y: 88,
      w: 44,
      h: 3,
      fit: "single-line",
      defaultText: "FOUNDER & CHIEF EXECUTIVE OFFICER",
    },
  ],
};

// ---------------------------------------------------------------------------
// SURFACE_PAIR — light slide with a two-line hero on top, and two side-by-
// side panels below: one default-surface, one dark-surface. Each panel has
// its own eyebrow, big stat, and body. Exercises element-level surface
// swap at panel scale (not just card scale).
// ---------------------------------------------------------------------------

function panel(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  surface: SurfaceState,
  eyebrow: string,
  stat: string,
  body: string
): CompositionElement[] {
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
      id: `${id}_stat`,
      role: "stat-value",
      surface,
      x: x + px,
      y: y + 7,
      w: w - 2 * px,
      h: 19,
      fit: "single-line",
      defaultText: stat,
    },
    {
      id: `${id}_body`,
      role: "card-body",
      surface,
      x: x + px,
      y: y + 29,
      w: w - 2 * px,
      h: h - 31,
      fit: "multi-line",
      defaultText: body,
    },
  ];
}

/**
 * Like `panel()` but uses `stat-value-mid` (5–5.5%) instead of `stat-value`
 * (8–9%). For card-sized panels where the stat needs to be impactful but
 * shorter strings like "30,000+" must still fit a ~28%-wide card.
 */
function statCardMid(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  surface: SurfaceState,
  eyebrow: string,
  stat: string,
  body: string
): CompositionElement[] {
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
      id: `${id}_stat`,
      role: "stat-value-mid",
      surface,
      x: x + px,
      y: y + 7,
      w: w - 2 * px,
      h: 13,
      fit: "single-line",
      defaultText: stat,
    },
    {
      id: `${id}_body`,
      role: "card-body",
      surface,
      x: x + px,
      y: y + 22,
      w: w - 2 * px,
      h: h - 24,
      fit: "multi-line",
      defaultText: body,
    },
  ];
}

/**
 * Build a data-table composition fragment: a card-surface highlight for
 * any column that opts in (`highlight: true`), a header row with optional
 * sub-labels, body rows with hairline dividers between them, and per-cell
 * Text elements with appropriate surface state.
 *
 * Columns share equal width across the table's `w`. The first column is
 * the row-label column (typically left-aligned text); other columns are
 * value columns (typically center-aligned). Headers and cells use `card-`
 * roles so styling propagates from the active design system.
 */
function table(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  options: {
    headers: Array<{ label: string; sublabel?: string; highlight?: boolean }>;
    rows: Array<{ label: string; values: string[] }>;
  }
): CompositionElement[] {
  const elements: CompositionElement[] = [];
  const colCount = options.headers.length;
  const rowCount = options.rows.length;
  const colWidth = w / colCount;
  const headerHeight = 9; // % canvas height
  const rowHeight = (h - headerHeight) / rowCount;
  // Tight padding — table cells lose less vertical space to padding so
  // card-body's line height + descender room fits inside `rowHeight`.
  const cellPadX = 0.5;
  const cellPadY = 0.25;

  // Highlighted-column surface: a single rect spanning the entire column
  // height. Cells in this column declare surface: "dark" so their text
  // resolves against the dark ground.
  const highlightIdx = options.headers.findIndex((header) => header.highlight);
  if (highlightIdx >= 0) {
    elements.push({
      id: `${id}_highlight`,
      role: "card-surface",
      surface: "dark",
      x: x + highlightIdx * colWidth,
      y,
      w: colWidth,
      h,
    });
  }

  // Header row — column labels with optional sub-labels
  options.headers.forEach((header, i) => {
    const cellX = x + i * colWidth + cellPadX;
    const cellW = colWidth - 2 * cellPadX;
    const surface: SurfaceState = i === highlightIdx ? "dark" : "default";
    elements.push({
      id: `${id}_h${i}_label`,
      role: "card-eyebrow",
      surface,
      x: cellX,
      y: y + 1,
      w: cellW,
      h: 3,
      fit: "single-line",
      align: i === 0 ? "left" : "center",
      defaultText: header.label,
    });
    if (header.sublabel) {
      elements.push({
        id: `${id}_h${i}_sub`,
        role: "stat-label",
        surface,
        x: cellX,
        y: y + 4.5,
        w: cellW,
        h: 3,
        fit: "single-line",
        align: i === 0 ? "left" : "center",
        defaultText: header.sublabel,
      });
    }
  });

  // Body rows — each with a hairline above (skipping the very first which
  // sits flush against the header) and a row label + N value cells.
  options.rows.forEach((row, rowIdx) => {
    const rowY = y + headerHeight + rowIdx * rowHeight;

    // Hairline divider above the row.
    elements.push({
      id: `${id}_r${rowIdx}_rule`,
      role: "divider",
      x,
      y: rowY,
      w,
      h: 0,
    });

    // Row label (column 0).
    elements.push({
      id: `${id}_r${rowIdx}_label`,
      role: "card-body",
      surface: 0 === highlightIdx ? "dark" : "default",
      x: x + cellPadX,
      y: rowY + cellPadY,
      w: colWidth - 2 * cellPadX,
      h: rowHeight - 2 * cellPadY,
      fit: "single-line",
      align: "left",
      defaultText: row.label,
    });

    // Value cells (columns 1..N).
    row.values.forEach((value, valueIdx) => {
      const cellColIdx = valueIdx + 1;
      if (cellColIdx >= colCount) return; // gracefully ignore extras
      const cellX = x + cellColIdx * colWidth + cellPadX;
      const surface: SurfaceState = cellColIdx === highlightIdx ? "dark" : "default";
      elements.push({
        id: `${id}_r${rowIdx}_c${cellColIdx}`,
        role: "card-body",
        surface,
        x: cellX,
        y: rowY + cellPadY,
        w: colWidth - 2 * cellPadX,
        h: rowHeight - 2 * cellPadY,
        fit: "single-line",
        align: "center",
        defaultText: value,
      });
    });
  });

  return elements;
}

export const SURFACE_PAIR: LayoutComposition = {
  name: "surface-pair",
  description:
    "Light slide with a 2-line hero and two side-by-side panels: a default-ground panel and a dark-ground panel. Used for revenue/cost contrasts, our-stat vs market-stat, before/after — anywhere two halves need equal weight but opposite tone.",
  elements: [
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 22,
      h: 3,
      fit: "single-line",
      defaultText: "04 / UNIT ECONOMICS",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "12 / 28",
    },
    {
      id: "hero_1",
      role: "hero",
      x: 6,
      y: 16,
      w: 82,
      h: 14,
      fit: "single-line",
      defaultText: "Where revenue comes,",
    },
    {
      id: "hero_2",
      role: "hero-accent",
      x: 6,
      y: 28,
      w: 82,
      h: 14,
      fit: "single-line",
      defaultText: "and where it goes.",
    },
    ...panel(
      "panel_l",
      6,
      50,
      42,
      44,
      "default",
      "REVENUE BUILD",
      "$1.18M",
      "Annual ACV from a mature enterprise account: 24 seats at $4.1K each, services attached."
    ),
    ...panel(
      "panel_r",
      52,
      50,
      42,
      44,
      "dark",
      "OPEX SHARE",
      "19.4%",
      "Operating margin after R&D (28%), GTM (24%), G&A (10%), and infrastructure costs."
    ),
  ],
};

// ---------------------------------------------------------------------------
// STAT_ROW_BOTTOM — image-left + hero-right cover variant, with a row of
// four stats anchored to the bottom-right. Used for "audience profile" /
// "what walks in" / "by the numbers" slides where one big visual carries
// the slide and the numbers are supporting evidence.
// ---------------------------------------------------------------------------

export const STAT_ROW_BOTTOM: LayoutComposition = {
  name: "stat-row-bottom",
  description:
    "Light slide: contained image on the left half, eyebrow + 2-line hero + 4-stat row on the right. Hairline divider above the stat row separates narrative from numbers.",
  elements: [
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 22,
      h: 3,
      fit: "single-line",
      defaultText: "03 / POSITIONING",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "09 / 28",
    },
    // Image — contained on the left half.
    { id: "image", role: "image", x: 6, y: 14, w: 38, h: 80 },
    // Right column: eyebrow + 3-line hero (third line is the accent)
    {
      id: "eyebrow",
      role: "eyebrow",
      x: 50,
      y: 16,
      w: 44,
      h: 3,
      fit: "single-line",
      defaultText: "WHO USES IT",
    },
    {
      id: "hero_1",
      role: "hero",
      x: 50,
      y: 21,
      w: 44,
      h: 14,
      fit: "single-line",
      defaultText: "A member who",
    },
    {
      id: "hero_2",
      role: "hero",
      x: 50,
      y: 33,
      w: 44,
      h: 14,
      fit: "single-line",
      defaultText: "trains here",
    },
    {
      id: "hero_3",
      role: "hero-accent",
      x: 50,
      y: 45,
      w: 44,
      h: 14,
      fit: "single-line",
      defaultText: "3.1× a week.",
    },
    {
      id: "body",
      role: "body",
      x: 50,
      y: 60,
      w: 44,
      h: 12,
      fit: "multi-line",
      defaultText:
        "Class mix: 28% strength, 32% mobility, 22% yoga, 18% cycling — flat curve across formats.",
    },
    // Hairline divider + 4-stat row at bottom-right, using stat-value-small.
    { id: "stat_rule", role: "divider", x: 50, y: 76, w: 44, h: 0 },
    {
      id: "stat_1_value",
      role: "card-title",
      x: 50,
      y: 80,
      w: 11,
      h: 8,
      fit: "single-line",
      defaultText: "$149",
    },
    {
      id: "stat_1_label",
      role: "stat-label",
      x: 50,
      y: 90,
      w: 11,
      h: 3,
      fit: "single-line",
      defaultText: "AVG SPEND",
    },
    {
      id: "stat_2_value",
      role: "card-title",
      x: 61,
      y: 80,
      w: 11,
      h: 8,
      fit: "single-line",
      defaultText: "3.1×",
    },
    {
      id: "stat_2_label",
      role: "stat-label",
      x: 61,
      y: 90,
      w: 11,
      h: 3,
      fit: "single-line",
      defaultText: "VISITS / WK",
    },
    {
      id: "stat_3_value",
      role: "card-title",
      x: 72,
      y: 80,
      w: 11,
      h: 8,
      fit: "single-line",
      defaultText: "73%",
    },
    {
      id: "stat_3_label",
      role: "stat-label",
      x: 72,
      y: 90,
      w: 11,
      h: 3,
      fit: "single-line",
      defaultText: "RETENTION",
    },
    {
      id: "stat_4_value",
      role: "card-title",
      x: 83,
      y: 80,
      w: 11,
      h: 8,
      fit: "single-line",
      defaultText: "6–9p",
    },
    {
      id: "stat_4_label",
      role: "stat-label",
      x: 83,
      y: 90,
      w: 11,
      h: 3,
      fit: "single-line",
      defaultText: "PEAK HOURS",
    },
  ],
};

// ---------------------------------------------------------------------------
// BRAND_STORY_SPLIT — image right, narrative left. Eyebrow + 3-line hero
// (last line italic-accent) + body paragraph + hairline + 3-stat row at
// the bottom. Modeled on the "From a single 10-seat counter to 62 stores"
// pattern. For brand-story, company-history, founder-narrative slides
// where one image carries the tone and a stat row anchors the bottom.
// ---------------------------------------------------------------------------

export const BRAND_STORY_SPLIT: LayoutComposition = {
  name: "brand-story-split",
  description:
    "Light slide: image on the right, narrative on the left. Eyebrow + 3-line hero (last line is italic-accent) + body paragraph + hairline + 3-stat row at the bottom. For brand-story / founder-narrative slides where one image carries the tone.",
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
      defaultText: "01 / BRAND STORY",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "02 / 28",
    },
    // Left column: eyebrow + 3-line hero
    {
      id: "eyebrow",
      role: "eyebrow",
      x: 6,
      y: 18,
      w: 42,
      h: 3,
      fit: "single-line",
      defaultText: "FOUNDED 2014 · KYOTO, JAPAN",
    },
    {
      id: "hero_1",
      role: "hero",
      x: 6,
      y: 22,
      w: 44,
      h: 14,
      fit: "single-line",
      defaultText: "From a loom",
    },
    {
      id: "hero_2",
      role: "hero",
      x: 6,
      y: 34,
      w: 44,
      h: 14,
      fit: "single-line",
      defaultText: "to 41 shops",
    },
    {
      id: "hero_3",
      role: "hero-accent",
      x: 6,
      y: 46,
      w: 44,
      h: 14,
      fit: "single-line",
      defaultText: "in 4 cities.",
    },
    // Body paragraph
    {
      id: "body",
      role: "body",
      x: 6,
      y: 66,
      w: 44,
      h: 16,
      fit: "multi-line",
      defaultText:
        "Loma Knit weaves merino on family looms in Kyoto. Direct-to-customer model keeps 80% of margin with the makers.",
    },
    // Hairline + 3-stat row at bottom
    { id: "stat_rule", role: "divider", x: 6, y: 84, w: 44, h: 0 },
    {
      id: "stat_1_value",
      role: "card-title",
      x: 6,
      y: 86,
      w: 14,
      h: 8,
      fit: "single-line",
      defaultText: "41",
    },
    {
      id: "stat_1_label",
      role: "stat-label",
      x: 6,
      y: 95,
      w: 14,
      h: 3,
      fit: "single-line",
      defaultText: "BOUTIQUES",
    },
    {
      id: "stat_2_value",
      role: "card-title",
      x: 21,
      y: 86,
      w: 14,
      h: 8,
      fit: "single-line",
      defaultText: "4",
    },
    {
      id: "stat_2_label",
      role: "stat-label",
      x: 21,
      y: 95,
      w: 14,
      h: 3,
      fit: "single-line",
      defaultText: "CITIES",
    },
    {
      id: "stat_3_value",
      role: "card-title",
      x: 36,
      y: 86,
      w: 14,
      h: 8,
      fit: "single-line",
      defaultText: "78%",
    },
    {
      id: "stat_3_label",
      role: "stat-label",
      x: 36,
      y: 95,
      w: 14,
      h: 3,
      fit: "single-line",
      defaultText: "REPEAT BUYERS",
    },
    // Image on the right
    { id: "image", role: "image", x: 52, y: 18, w: 42, h: 76 },
  ],
};

// ---------------------------------------------------------------------------
// MULTI_STAT_ASYMMETRIC — light slide; hero + body on the left, one big
// anchor-stat panel (dark) on the right, 3 mixed-fill stat cards across
// the bottom. For market-context / why-this-matters slides combining a
// narrative thesis, an anchor metric, and supporting evidence.
// ---------------------------------------------------------------------------

export const MULTI_STAT_ASYMMETRIC: LayoutComposition = {
  name: "multi-stat-asymmetric",
  description:
    "Light slide: hero + body on the left, anchor-stat panel (dark) on the right, 3 supporting stat cards across the bottom — two on the default surface, one on the accent surface for emphasis. For 'why this matters / how big the market is' slides.",
  elements: [
    // Chrome
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "02 / MARKET",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "05 / 28",
    },
    // Hero — two regular lines, second line uses `*marker*` inline-accent
    // markup so "now." renders as an italic-accent <Anuma.Span> inside the
    // parent <Anuma.Text>. No box-clipping, no per-glyph alignment math
    // — the renderer handles the flow naturally as one text run.
    {
      id: "hero_1",
      role: "hero",
      x: 6,
      y: 10,
      w: 52,
      h: 14,
      fit: "single-line",
      defaultText: "Why EV now.",
    },
    {
      id: "hero_2",
      role: "hero",
      x: 6,
      y: 22,
      w: 52,
      h: 14,
      fit: "single-line",
      defaultText: "Why *us.*",
    },
    // Multi-line body left, BELOW the hero. Wraps to ~2-3 lines.
    {
      id: "body",
      role: "body",
      x: 6,
      y: 42,
      w: 44,
      h: 16,
      fit: "multi-line",
      defaultText:
        "Luxury EV is the fastest-growing automotive segment. Premium buyers shift electric at 3× the rate of mass-market.",
    },
    // Anchor stat panel (dark) — same y as body, on the right. No body
    // text in the panel (just eyebrow + big stat) so it fits a tight
    // vertical band without crowding the bottom card row.
    {
      id: "anchor_surface",
      role: "card-surface",
      surface: "dark",
      x: 52,
      y: 42,
      w: 42,
      h: 22,
    },
    {
      id: "anchor_eyebrow",
      role: "card-eyebrow",
      surface: "dark",
      x: 54,
      y: 44,
      w: 38,
      h: 3,
      fit: "single-line",
      defaultText: "GLOBAL LUXURY EV · 2025",
    },
    {
      id: "anchor_stat",
      role: "stat-value-mid",
      surface: "dark",
      x: 54,
      y: 48,
      w: 38,
      h: 14,
      fit: "single-line",
      defaultText: "$320B",
    },
    // Bottom stat-card row: default / default / accent. h=30 leaves room
    // for stat-value-mid (h=13) + one line of card-body.
    ...statCardMid(
      "card_1",
      6,
      66,
      28,
      30,
      "default",
      "CAGR · 2024-2030",
      "24.7%",
      "vs 9% mass-market EV."
    ),
    ...statCardMid(
      "card_2",
      36,
      66,
      28,
      30,
      "default",
      "AVG SELLING PRICE",
      "$185K",
      "our target segment."
    ),
    ...statCardMid(
      "card_3",
      66,
      66,
      28,
      30,
      "accent",
      "VOLTA · TARGET 2030",
      "75K",
      "annual deliveries.",
    ),
  ],
};

// ---------------------------------------------------------------------------
// PEER_COMPARISON_TABLE — light slide with a 2-line hero (inline italic
// accent) and a data table comparing OUR terms to N peer composites. The
// "us" column is highlighted (dark surface running the full column
// height); peer columns sit on the default surface. For franchise-policy
// / pricing / spec-sheet slides where the message is "here's how we
// compare line-by-line."
// ---------------------------------------------------------------------------

export const PEER_COMPARISON_TABLE: LayoutComposition = {
  name: "peer-comparison-table",
  description:
    "Light slide: 2-line hero with inline italic accent + a data table comparing our terms to N peer composites. The 'us' column is highlighted as a dark-surface stripe running the full table height. Use for pricing, terms, or spec comparisons.",
  elements: [
    // Chrome
    {
      id: "chrome_left",
      role: "chrome-left",
      x: 6,
      y: 5,
      w: 30,
      h: 3,
      fit: "single-line",
      defaultText: "06 / FRANCHISE POLICY",
    },
    {
      id: "chrome_right",
      role: "chrome-right",
      x: 70,
      y: 5,
      w: 24,
      h: 3,
      fit: "single-line",
      defaultText: "19 / 28",
    },
    // 2-line hero with inline italic accent
    {
      id: "hero_1",
      role: "hero",
      x: 6,
      y: 12,
      w: 88,
      h: 14,
      fit: "single-line",
      defaultText: "How our terms compare",
    },
    {
      id: "hero_2",
      role: "hero",
      x: 6,
      y: 24,
      w: 88,
      h: 14,
      fit: "single-line",
      defaultText: "to *the market*.",
    },
    // The table — 6 columns × 6 rows, "us" column highlighted.
    ...table("terms", 6, 46, 88, 46, {
      headers: [
        { label: "FRANCHISE TERM" },
        { label: "SOURDOUGH CO", sublabel: "Bakery · 45 m²", highlight: true },
        { label: "PEER · A", sublabel: "Artisan bread, U.S." },
        { label: "PEER · B", sublabel: "Patisserie, EU" },
        { label: "PEER · C", sublabel: "Café-bakery, AU" },
        { label: "PEER · D", sublabel: "Bagels, U.S." },
      ],
      rows: [
        { label: "Initial fee", values: ["$35,000", "$45,000", "$50,000", "$40,000", "$30,000"] },
        { label: "Royalty", values: ["6.0%", "7.0%", "6.5%", "7.5%", "5.5%"] },
        { label: "Brand fund", values: ["2.0%", "3.0%", "2.5%", "2.0%", "2.5%"] },
        { label: "Term", values: ["10 yr", "10 yr", "10 yr", "10 yr", "3 yr"] },
        {
          label: "Territory",
          values: ["800 m + ROFR", "1.0 mi hard", "Discretionary", "0.5 mi hard", "None"],
        },
        { label: "Training (days)", values: ["21", "14", "10", "12", "7"] },
      ],
    }),
    // Footer disclaimer
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 94,
      w: 88,
      h: 3,
      fit: "single-line",
      defaultText: "PEER COLUMNS ARE ILLUSTRATIVE COMPOSITES · NOT LEGAL ADVICE",
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
 * under the given surface state. Falls back to `defaultBackground` for
 * "default" state so compositions whose literal-hex text colors assume
 * a specific surface stay readable regardless of the deck's slideBg.
 * Returns null only if the system declares no default background and
 * the state has no treatment.
 */
function surfaceBackground(system: DesignSystem, state: SurfaceState): string | null {
  if (state === "default") return system.defaultBackground ?? null;
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

/**
 * Map a role to its companion "accent" role, used for inline-italic-accent
 * spans within text. Returns null when the role has no accent companion.
 * The accent role's `fontStyle` and `color` are the values that get
 * applied to inline `<Anuma.Span>` children — everything else (fontSize,
 * fontFamily, fontWeight, letterSpacing) inherits from the parent Text.
 */
function accentRoleFor(role: ElementRole): ElementRole | null {
  if (role === "hero") return "hero-accent";
  if (role === "quote") return "quote-accent";
  return null;
}

/**
 * Build the inner JSX of a Text element from text that may contain
 * `*marker*` inline accents. Each `*...*` segment becomes an
 * `<Anuma.Span>` styled with the parent role's accent companion. Plain
 * text segments are escaped and emitted as-is. Returns the concatenated
 * inner JSX string.
 *
 * Example: `"Why *now.*"` with parent role `hero` →
 *   `Why <Anuma.Span style={{fontStyle: "italic", color: "..."}}>now.</Anuma.Span>`
 */
function renderInlineAccents(
  text: string,
  parentRole: ElementRole,
  system: DesignSystem,
  state: SurfaceState
): string {
  const accentRole = accentRoleFor(parentRole);
  if (!accentRole || !text.includes("*")) {
    return escapeText(text);
  }
  const accentStyle = resolveStyle(system, accentRole, state);
  // Build inline span attrs — only the bits that differ from the
  // parent: fontStyle and color. fontSize / family / weight inherit.
  const spanProps: string[] = [];
  if (accentStyle.fontStyle) spanProps.push(`fontStyle: "${accentStyle.fontStyle}"`);
  if (accentStyle.color) spanProps.push(`color: "${accentStyle.color}"`);
  const spanStyle = `{{ ${spanProps.join(", ")} }}`;
  const parts: string[] = [];
  let lastIndex = 0;
  const re = /\*([^*]+)\*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeText(text.slice(lastIndex, match.index)));
    }
    parts.push(`<Anuma.Span style=${spanStyle}>${escapeText(match[1]!)}</Anuma.Span>`);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(escapeText(text.slice(lastIndex)));
  }
  return parts.join("");
}

function emitText(
  el: CompositionElement,
  s: RoleStyle,
  fontPreset: { heading: string; body: string },
  system: DesignSystem,
  state: SurfaceState
): string {
  const text = el.defaultText ?? "";
  const fontRole = s.fontFamily === "heading" ? "heading" : "body";
  // Element-level align overrides the role's default alignment.
  const resolved = el.align ? { ...s, align: el.align } : s;
  const style = styleObject(resolved, fontPreset);
  const body = renderInlineAccents(text, el.role, system, state);
  return `<Anuma.Text id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} fontRole="${fontRole}" style=${style}>${body}</Anuma.Text>`;
}

function emitDivider(el: CompositionElement, s: RoleStyle): string {
  return `<Anuma.Line id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={0} stroke="${s.color}" strokeWidth={1} />`;
}

function emitAccentBar(el: CompositionElement, s: RoleStyle): string {
  return `<Anuma.Rect id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} fill="${s.color}" cornerRadius={0.2} />`;
}

function emitMarker(el: CompositionElement, s: RoleStyle): string {
  return `<Anuma.Circle id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} fill="${s.color}" />`;
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

/**
 * Build an `<Anuma.Group>` for a flex region plus one inner Group per
 * item. The compiler walks `region.defaultItems` and, for each entry,
 * realises `region.item` (the template) into concrete sub-elements with
 * sequential slot ids (`${prefix}_1_title`, `${prefix}_2_title`, …).
 *
 * Sub-elements use the renderer's flex flow — no x/y on them — so item
 * count can vary without touching geometry.
 */
function emitFlexRegion(
  region: FlexRegion,
  system: DesignSystem,
  slideState: SurfaceState,
  fontPreset: { heading: string; body: string }
): string {
  const itemState: SurfaceState = region.surface ?? slideState;
  const layoutAttrs: string[] = [
    `layout="${region.layout}"`,
    ...(region.gap !== undefined ? [`gap={${pxY(region.gap)}}`] : []),
    ...(region.padding !== undefined ? [`padding={${pxY(region.padding)}}`] : []),
    ...(region.justify ? [`justify="${region.justify}"`] : []),
    ...(region.align ? [`align="${region.align}"`] : []),
  ];
  const innerLayout = region.itemLayout ?? "row";
  const innerAttrs: string[] = [
    `layout="${innerLayout}"`,
    ...(region.itemGap !== undefined ? [`gap={${pxY(region.itemGap)}}`] : []),
    ...(region.itemJustify ? [`justify="${region.itemJustify}"`] : []),
    ...(region.itemAlign ? [`align="${region.itemAlign}"`] : []),
  ];
  // Resolve the divider color once for separator lines. Pulls from the
  // design system's `divider` role under the region's surface state.
  const separatorStyle = region.separator
    ? resolveStyle(system, "divider", itemState)
    : null;
  const itemParts: string[] = [];
  for (let i = 0; i < region.defaultItems.length; i++) {
    itemParts.push(
      emitFlexItem(region, i + 1, region.defaultItems[i]!, system, itemState, fontPreset, innerAttrs)
    );
    if (separatorStyle) {
      itemParts.push(emitFlexSeparator(region, i + 1, separatorStyle));
    }
  }
  return `<Anuma.Group id="${region.idPrefix}" x={${pxX(region.x)}} y={${pxY(region.y)}} w={${pxX(region.w)}} h={${pxY(region.h)}} ${layoutAttrs.join(" ")}>
${itemParts.join("\n")}
</Anuma.Group>`;
}

/** Hairline sibling between items in a flex region. */
function emitFlexSeparator(region: FlexRegion, afterIndex: number, style: RoleStyle): string {
  const id = `${region.idPrefix}_${afterIndex}_rule`;
  return `<Anuma.Line id="${id}" stroke="${style.color}" strokeWidth={1} />`;
}

function emitFlexItem(
  region: FlexRegion,
  index: number,
  data: FlexItemDefault,
  system: DesignSystem,
  state: SurfaceState,
  fontPreset: { heading: string; body: string },
  innerAttrs: string[]
): string {
  const children = region.item
    .map((rel) => emitRelativeElement(region, rel, index, data, system, state, fontPreset))
    .join("\n");
  const itemId = `${region.idPrefix}_${index}`;
  return `<Anuma.Group id="${itemId}" ${innerAttrs.join(" ")}>
${children}
</Anuma.Group>`;
}

/** Realise a RelativeElement into JSX for one item instance. */
function emitRelativeElement(
  region: FlexRegion,
  rel: RelativeElement,
  index: number,
  data: FlexItemDefault,
  system: DesignSystem,
  state: SurfaceState,
  fontPreset: { heading: string; body: string }
): string {
  const id = `${region.idPrefix}_${index}_${rel.id}`;
  const elState: SurfaceState = rel.surface ?? state;
  const s = resolveStyle(system, rel.role, elState);
  const sizeAttrs: string[] = [
    ...(rel.w !== undefined ? [`w={${pxX(rel.w)}}`] : []),
    ...(rel.h !== undefined ? [`h={${pxY(rel.h)}}`] : []),
    ...(rel.grow !== undefined ? [`grow={${rel.grow}}`] : []),
  ];
  // Shape roles render as the relevant primitive without text.
  if (rel.role === "divider") {
    return `<Anuma.Line id="${id}" ${sizeAttrs.join(" ")} stroke="${s.color}" strokeWidth={1} />`;
  }
  if (rel.role === "accent-bar") {
    return `<Anuma.Rect id="${id}" ${sizeAttrs.join(" ")} fill="${s.color}" cornerRadius={0.2} />`;
  }
  if (rel.role === "marker") {
    return `<Anuma.Circle id="${id}" ${sizeAttrs.join(" ")} fill="${s.color}" />`;
  }
  // Default: text element with role styling. align override + inline-accent
  // markers behave the same as in absolute elements.
  const text = data[rel.id] ?? rel.defaultText ?? "";
  const fontRole = s.fontFamily === "heading" ? "heading" : "body";
  const resolved = rel.align ? { ...s, align: rel.align } : s;
  const style = styleObject(resolved, fontPreset);
  const body = renderInlineAccents(text, rel.role, system, elState);
  return `<Anuma.Text id="${id}" ${sizeAttrs.join(" ")} fontRole="${fontRole}" style=${style}>${body}</Anuma.Text>`;
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
 * Return a copy of `system` with its declared accent (`system.accent`)
 * swapped for `override`. Walks every `color` field in `styles` and in
 * every surface's `overrides` map, plus surface backgrounds; substitutes
 * any value equal to `system.accent.base` with `override.base` and any
 * value equal to `system.accent.onDark` with `override.onDark`.
 *
 * Why a pre-compile rewrite vs a runtime token: keeps `DesignSystem` a
 * flat literal-hex shape that's trivial to read in tests and dumps. The
 * accent override is the one knob we expose; everything else stays
 * curated.
 *
 * Pass-through behavior: if `system.accent` is undefined (monochrome or
 * palette-driven systems) the input is returned unchanged.
 */
export function applyAccent(
  system: DesignSystem,
  override: { base: string; onDark?: string }
): DesignSystem {
  if (!system.accent) return system;
  const oldBase = system.accent.base.toLowerCase();
  const oldDark = system.accent.onDark.toLowerCase();
  const newBase = override.base;
  const newDark = override.onDark ?? lightenForDarkSurface(override.base);
  const swap = (c: string | undefined): string | undefined => {
    if (!c) return c;
    const k = c.toLowerCase();
    if (k === oldBase) return newBase;
    if (k === oldDark) return newDark;
    return c;
  };
  const rewriteStyle = (style: RoleStyle): RoleStyle => {
    const next = swap(style.color) ?? style.color;
    return next === style.color ? style : { ...style, color: next };
  };
  const rewriteStyles = (
    map: Record<string, RoleStyle>
  ): Record<string, RoleStyle> => {
    const out: Record<string, RoleStyle> = {};
    for (const [k, v] of Object.entries(map)) out[k] = rewriteStyle(v);
    return out;
  };
  const rewriteOverrides = (
    map: SurfaceTreatment["overrides"]
  ): SurfaceTreatment["overrides"] => {
    const out: SurfaceTreatment["overrides"] = {};
    for (const [k, v] of Object.entries(map)) {
      if (v && typeof v === "object" && "color" in v) {
        const next = swap(v.color);
        out[k as ElementRole] = next === v.color ? v : { ...v, color: next };
      } else {
        out[k as ElementRole] = v;
      }
    }
    return out;
  };
  const surfaces: DesignSystem["surfaces"] = system.surfaces
    ? Object.fromEntries(
        Object.entries(system.surfaces).map(([k, t]) => [
          k,
          {
            background: swap(t.background) ?? t.background,
            overrides: rewriteOverrides(t.overrides),
          },
        ])
      )
    : undefined;
  return {
    ...system,
    styles: rewriteStyles(system.styles) as DesignSystem["styles"],
    surfaces,
    accent: { base: newBase, onDark: newDark },
  };
}

/**
 * Lighten a hex color in HSL space — bumps L by ~22 points (clamped at
 * 0.78) so an arbitrary accent stays legible on a dark surface. Used as
 * the default when `applyAccent` is called without an explicit `onDark`,
 * which is the typical LLM call ("here's one hex, you figure out the
 * dark variant").
 */
function lightenForDarkSurface(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return hslToHex(h, s, Math.min(0.78, l + 0.22));
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  const to255 = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(r1)}${to255(g1)}${to255(b1)}`.toUpperCase();
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
  for (const child of composition.elements) {
    if (isFlexRegion(child)) {
      lines.push(emitFlexRegion(child, system, slideState, fontPreset));
      continue;
    }
    const el = child;
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
      case "marker":
        lines.push(emitMarker(el, s));
        break;
      case "card-surface":
        lines.push(emitCardSurface(el, system, elState));
        break;
      case "image":
        lines.push(emitImage(el, system, elState));
        break;
      default:
        lines.push(emitText(el, s, fontPreset, system, elState));
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
  /** Visible line height in pixels (font size × line-height). Used for max-lines. */
  linePx: number;
  /**
   * Minimum box height in pixels needed to render one line without clipping
   * glyph descenders (g, p, y, j, q). Real fonts extend ~15% below baseline
   * even when line-height is 1.0, so this is `fontSize × max(lineHeight, 1.15)`.
   */
  safeLinePx: number;
  /** Box height in pixels — must be ≥ safeLinePx to fit a single line cleanly. */
  boxHeightPx: number;
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
  // Descender allowance: even at lineHeight 1.0, real fonts extend ~15%
  // below baseline. Box must accommodate at least this much to avoid
  // clipping glyphs like g/p/y/j/q.
  const safeLinePx = fontSizePx * Math.max(lineHeight, 1.15);
  const maxLines = Math.max(1, Math.floor(boxHeightPx / linePx));
  return {
    charsPerLine,
    maxLines,
    total: charsPerLine * maxLines,
    linePx,
    safeLinePx,
    boxHeightPx,
  };
}

const STATIC_ROLES: ReadonlySet<ElementRole> = new Set([
  "divider",
  "accent-bar",
  "marker",
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
  for (const child of composition.elements) {
    if (isFlexRegion(child)) {
      out.push("");
      out.push(
        `  Flex region ${child.idPrefix} — ${child.defaultItems.length} items, layout="${child.layout}". Add or remove items as needed; the model passes ${child.idPrefix}_<index>_<slot> ids for each.`
      );
      for (const rel of child.item) {
        if (STATIC_ROLES.has(rel.role)) {
          out.push(`    - ${child.idPrefix}_<index>_${rel.id} [${rel.role}]: static element, no content`);
          continue;
        }
        const style = system.styles[rel.role];
        if (!style) continue;
        const budget = estimateRelativeSlotBudget(rel, child, style, fontPreset);
        const fit: FitMode = rel.fit ?? "multi-line";
        if (fit === "single-line") {
          out.push(`    - ${child.idPrefix}_<index>_${rel.id} [${rel.role}]: ≤ ${budget.charsPerLine} chars, ONE LINE.`);
        } else {
          out.push(
            `    - ${child.idPrefix}_<index>_${rel.id} [${rel.role}]: ≤ ${budget.charsPerLine} chars/line × ${budget.maxLines} lines (~${budget.total} chars total).`
          );
        }
      }
      continue;
    }
    const el = child;
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

/**
 * Estimate the per-instance slot budget for a RelativeElement inside a
 * FlexRegion. Falls back to region-derived defaults when the relative
 * element doesn't set its own w/h: width = region.w - padding (or split
 * if itemLayout is "row"), height = region.h / item-count (or set if
 * itemLayout is "column").
 *
 * This is approximate — actual rendered size depends on flex flow with
 * siblings — but matches the "did the model overflow" check we need.
 */
function estimateRelativeSlotBudget(
  rel: RelativeElement,
  region: FlexRegion,
  style: RoleStyle,
  fontPreset: { heading: string; body: string }
): SlotBudget {
  const padding = region.padding ?? 0;
  const gap = region.gap ?? 0;
  const itemCount = Math.max(1, region.defaultItems.length);
  // Default width/height heuristics when the rel doesn't specify them.
  let w = rel.w;
  let h = rel.h;
  if (w === undefined) {
    if (region.layout === "row") {
      // Items lay out horizontally — divide the region's inner width.
      w = (region.w - 2 * padding - gap * (itemCount - 1)) / itemCount;
    } else {
      // Column layout — items get the full inner width.
      w = region.w - 2 * padding;
    }
  }
  if (h === undefined) {
    if (region.layout === "column") {
      // Items stack vertically — divide the region's inner height.
      h = (region.h - 2 * padding - gap * (itemCount - 1)) / itemCount;
    } else {
      // Row layout — each item gets the full inner height.
      h = region.h - 2 * padding;
    }
  }
  // Reuse estimateSlotBudget by faking a CompositionElement shape with
  // the derived geometry. Only the dimensions matter to the calculation.
  return estimateSlotBudget(
    { id: rel.id, role: rel.role, x: 0, y: 0, w, h, fit: rel.fit } as CompositionElement,
    style,
    fontPreset
  );
}

/**
 * Validate each item in a FlexRegion's defaultItems against the template
 * sub-elements' per-instance budgets. Returns one SlotIssue per overflowing
 * sub-element with the issue id prefixed by item index for traceability.
 */
function validateFlexRegionDefaults(
  region: FlexRegion,
  system: DesignSystem,
  fontPreset: { heading: string; body: string }
): SlotIssue[] {
  const issues: SlotIssue[] = [];
  for (let i = 0; i < region.defaultItems.length; i++) {
    const data = region.defaultItems[i]!;
    const idx = i + 1;
    for (const rel of region.item) {
      if (STATIC_ROLES.has(rel.role)) continue;
      const style = system.styles[rel.role];
      if (!style) continue;
      const text = data[rel.id] ?? rel.defaultText;
      if (!text) continue;
      const budget = estimateRelativeSlotBudget(rel, region, style, fontPreset);
      const fit: FitMode = rel.fit ?? "multi-line";
      const trimmed = text.trim();
      const visible = trimmed.replace(/\*([^*]+)\*/g, "$1");
      const fullId = `${region.idPrefix}_${idx}_${rel.id}`;
      if (budget.boxHeightPx < budget.safeLinePx) {
        issues.push({
          id: fullId,
          role: rel.role,
          text: trimmed,
          budget,
          fit,
          issue: `box too short for descenders: h=${Math.round(budget.boxHeightPx)}px < ${Math.round(budget.safeLinePx)}px needed (line ${Math.round(budget.linePx)}px + descender room)`,
        });
        continue;
      }
      if (fit === "single-line" && visible.length > budget.charsPerLine) {
        issues.push({
          id: fullId,
          role: rel.role,
          text: trimmed,
          budget,
          fit,
          issue: `single-line: ${visible.length} chars exceeds ${budget.charsPerLine}-char budget`,
        });
      } else if (fit === "multi-line" && visible.length > budget.total) {
        issues.push({
          id: fullId,
          role: rel.role,
          text: trimmed,
          budget,
          fit,
          issue: `multi-line: ${visible.length} chars exceeds ${budget.total}-char budget (${budget.maxLines}×${budget.charsPerLine})`,
        });
      }
    }
  }
  return issues;
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
  for (const child of composition.elements) {
    if (isFlexRegion(child)) {
      issues.push(...validateFlexRegionDefaults(child, system, fontPreset));
      continue;
    }
    const el = child;
    if (STATIC_ROLES.has(el.role)) continue;
    const style = system.styles[el.role];
    if (!style || !el.defaultText) continue;
    const budget = estimateSlotBudget(el, style, fontPreset);
    const fit: FitMode = el.fit ?? "multi-line";
    const text = el.defaultText.trim();
    // Strip inline-accent `*marker*` syntax before counting — the markers
    // are parsed out at render time and don't occupy visible space.
    const visibleText = text.replace(/\*([^*]+)\*/g, "$1");
    // Vertical-fit check: must accommodate one full line including
    // descender room (~15% below baseline). `safeLinePx` already includes
    // that, so this catches both tight-lineHeight and tight-box cases.
    if (budget.boxHeightPx < budget.safeLinePx) {
      issues.push({
        id: el.id,
        role: el.role,
        text,
        budget,
        fit,
        issue: `box too short for descenders: h=${Math.round(budget.boxHeightPx)}px < ${Math.round(budget.safeLinePx)}px needed (line ${Math.round(budget.linePx)}px + descender room)`,
      });
      continue;
    }
    if (fit === "single-line" && visibleText.length > budget.charsPerLine) {
      issues.push({
        id: el.id,
        role: el.role,
        text,
        budget,
        fit,
        issue: `single-line: ${visibleText.length} chars exceeds ${budget.charsPerLine}-char budget`,
      });
    } else if (fit === "multi-line" && visibleText.length > budget.total) {
      issues.push({
        id: el.id,
        role: el.role,
        text,
        budget,
        fit,
        issue: `multi-line: ${visibleText.length} chars exceeds ${budget.total}-char budget (${budget.maxLines}×${budget.charsPerLine})`,
      });
    }
  }
  return issues;
}

/**
 * The slide-level background the composition expects under its design
 * system. Resolved from `composition.backgroundColor` (explicit override),
 * then the system's surface treatment for the composition's surface state,
 * then the system's `defaultBackground`. Returns null when the composition
 * is happy to inherit the deck's slideBg.
 */
export function compositionSlideBackground(
  composition: LayoutComposition,
  system: DesignSystem
): string | null {
  if (composition.backgroundColor) return composition.backgroundColor;
  return surfaceBackground(system, composition.surface ?? "default");
}

/**
 * Validate the model-supplied content in a parsed slide against the
 * composition's slot budgets. Returns one SlotIssue per slot whose actual
 * text would overflow at render time. The slide must already be parsed —
 * we walk its top-level Text children, match by `attrs.id` to composition
 * slot ids, and count visible characters (joining inline span children
 * into one string).
 *
 * Slot ids must match exactly; `add_slide` dedupes ids when merging into
 * the deck, but the slide passed here is fresh and pre-dedupe.
 */
export function validateSlotContent(
  composition: LayoutComposition,
  system: DesignSystem,
  fontPreset: { heading: string; body: string },
  slide: { children: Array<{ tag?: string; attrs?: Record<string, unknown>; children?: unknown[] } | string> }
): SlotIssue[] {
  const issues: SlotIssue[] = [];
  // Recursively collect every Text element's id → joined-text in the
  // slide tree. Flex regions nest Text inside Anuma.Group children, so a
  // top-level-only walk would miss them.
  const textsBySlotId = new Map<string, string>();
  collectSlideTexts(slide.children, textsBySlotId);
  for (const child of composition.elements) {
    if (isFlexRegion(child)) {
      for (let i = 0; i < child.defaultItems.length; i++) {
        const idx = i + 1;
        for (const rel of child.item) {
          if (STATIC_ROLES.has(rel.role)) continue;
          const style = system.styles[rel.role];
          if (!style) continue;
          const fullId = `${child.idPrefix}_${idx}_${rel.id}`;
          const actual = textsBySlotId.get(fullId);
          if (actual === undefined) continue;
          const budget = estimateRelativeSlotBudget(rel, child, style, fontPreset);
          const fit: FitMode = rel.fit ?? "multi-line";
          const visibleText = actual.replace(/\*([^*]+)\*/g, "$1").trim();
          if (fit === "single-line" && visibleText.length > budget.charsPerLine) {
            issues.push({
              id: fullId,
              role: rel.role,
              text: actual,
              budget,
              fit,
              issue: `single-line: ${visibleText.length} chars exceeds ${budget.charsPerLine}-char budget`,
            });
          } else if (fit === "multi-line" && visibleText.length > budget.total) {
            issues.push({
              id: fullId,
              role: rel.role,
              text: actual,
              budget,
              fit,
              issue: `multi-line: ${visibleText.length} chars exceeds ${budget.total}-char budget (${budget.maxLines}×${budget.charsPerLine})`,
            });
          }
        }
      }
      continue;
    }
    const el = child;
    if (STATIC_ROLES.has(el.role)) continue;
    const style = system.styles[el.role];
    if (!style) continue;
    const actual = textsBySlotId.get(el.id);
    if (actual === undefined) continue;
    const budget = estimateSlotBudget(el, style, fontPreset);
    const fit: FitMode = el.fit ?? "multi-line";
    const visibleText = actual.replace(/\*([^*]+)\*/g, "$1").trim();
    if (fit === "single-line" && visibleText.length > budget.charsPerLine) {
      issues.push({
        id: el.id,
        role: el.role,
        text: actual,
        budget,
        fit,
        issue: `single-line: ${visibleText.length} chars exceeds ${budget.charsPerLine}-char budget`,
      });
    } else if (fit === "multi-line" && visibleText.length > budget.total) {
      issues.push({
        id: el.id,
        role: el.role,
        text: actual,
        budget,
        fit,
        issue: `multi-line: ${visibleText.length} chars exceeds ${budget.total}-char budget (${budget.maxLines}×${budget.charsPerLine})`,
      });
    }
  }
  return issues;
}

/** Concatenate string children and inline element bodies into one string. */
function joinTextChildren(children: unknown[]): string {
  const parts: string[] = [];
  for (const c of children) {
    if (typeof c === "string") {
      parts.push(c);
    } else if (
      c &&
      typeof c === "object" &&
      "children" in c &&
      Array.isArray((c as { children: unknown[] }).children)
    ) {
      parts.push(joinTextChildren((c as { children: unknown[] }).children));
    }
  }
  return parts.join("");
}

/**
 * Recursively walk a slide's child tree, collecting every Text element's
 * id → joined-text into `out`. Used by validateSlotContent so that Text
 * elements nested inside Anuma.Group wrappers (flex regions) are found
 * the same way as top-level text slots.
 */
function collectSlideTexts(
  children: Array<{ tag?: string; attrs?: Record<string, unknown>; children?: unknown[] } | string>,
  out: Map<string, string>
): void {
  for (const child of children) {
    if (typeof child === "string") continue;
    if (child.tag === "Text") {
      const id = typeof child.attrs?.id === "string" ? child.attrs.id : null;
      if (id) out.set(id, joinTextChildren(child.children ?? []));
      continue;
    }
    if (Array.isArray(child.children)) {
      collectSlideTexts(
        child.children as Array<
          { tag?: string; attrs?: Record<string, unknown>; children?: unknown[] } | string
        >,
        out
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Live-tools registry — bridges this proposal module into the live
// `plan_deck` / `add_slide` tools. Each composition × design system pair
// is registered under a compound name (e.g. "cover-split-portrait--
// editorial-warm"). The live tool flow treats these like additional
// layout names alongside the legacy 30-template catalog.
// ---------------------------------------------------------------------------

const ALL_COMPOSITIONS: LayoutComposition[] = [
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

const ALL_SYSTEMS: Array<{ name: string; system: DesignSystem }> = [
  { name: "editorial-warm", system: EDITORIAL_WARM },
  { name: "techno-bold", system: TECHNO_BOLD },
  { name: "corporate-modern", system: CORPORATE_MODERN },
  { name: "minimal-swiss", system: MINIMAL_SWISS },
  { name: "playful-creative", system: PLAYFUL_CREATIVE },
];

/**
 * Every compound `composition--system` name registered with the live
 * tools. Used by plan_deck's catalog and by add_slide's validation.
 */
export function listCompositionLayoutNames(): string[] {
  const names: string[] = [];
  for (const composition of ALL_COMPOSITIONS) {
    for (const { name } of ALL_SYSTEMS) {
      names.push(`${composition.name}--${name}`);
    }
  }
  return names;
}

/**
 * The names of every registered design system. Used by the system prompt
 * to describe the `--<system>` suffix shared across composition layouts.
 */
export function listDesignSystemNames(): string[] {
  return ALL_SYSTEMS.map((s) => s.name);
}

/**
 * Render the design-system catalog as a prompt-friendly block — one
 * line per system with its name and `useFor` hint. The model picks the
 * system at plan_deck time by reading this list and matching the
 * deck's topic / register to one of the use cases.
 */
export function renderDesignSystemCatalog(): string {
  return ALL_SYSTEMS.map(({ name, system }) => `- ${name} — ${system.useFor}`).join("\n");
}

/**
 * One entry per composition (not per compound name). The model picks a
 * composition by content shape from this catalog, then appends one of
 * the registered design-system suffixes to form the final layout name.
 * Avoids emitting the description N times across N systems.
 */
export function listCompositionDescriptions(): Array<{ name: string; description: string }> {
  return ALL_COMPOSITIONS.map((c) => ({ name: c.name, description: c.description }));
}

/**
 * Resolve a compound `composition--system` layout name to its parts, or
 * null when the name doesn't match any registered pair.
 */
export function resolveCompositionLayout(
  name: string
): { composition: LayoutComposition; system: DesignSystem; systemName: string } | null {
  for (const composition of ALL_COMPOSITIONS) {
    for (const entry of ALL_SYSTEMS) {
      if (name === `${composition.name}--${entry.name}`) {
        return { composition, system: entry.system, systemName: entry.name };
      }
    }
  }
  return null;
}

/**
 * Render a compound layout's recipe as a JSX string with placeholder
 * content. The model is expected to copy this verbatim and substitute
 * its own text in each slot. The recipe is the compile() output run
 * through the chosen design system, so it already has correct
 * coordinates, colors, fonts — the model only changes text content.
 *
 * When `accent` is provided, the system's accent color family is
 * swapped via `applyAccent()` before compile, so the recipe carries the
 * model's chosen hue. No-op for systems without an accent slot
 * (CORPORATE_MODERN, EDITORIAL_WARM).
 */
export function renderCompositionLayoutRecipe(
  name: string,
  fontPreset: { heading: string; body: string },
  accent?: { base: string; onDark?: string }
): string | null {
  const resolved = resolveCompositionLayout(name);
  if (!resolved) return null;
  const system = accent ? applyAccent(resolved.system, accent) : resolved.system;
  const slideJsx = compile(resolved.composition, system, fontPreset);
  const slots = describeComposition(resolved.composition, system, fontPreset);
  return `${name} — ${resolved.composition.description}

${slots}

Recipe (copy this slide JSX; substitute text content per slot — do not change x/y/w/h/style):

${slideJsx}`;
}
