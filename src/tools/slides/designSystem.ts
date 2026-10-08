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

/**
 * Finite set of semantic roles every slide element can play. A layout
 * composition references roles only; the design system decides what each
 * role concretely looks like.
 */
export type ElementRole =
  | "hero"
  | "hero-accent"
  | "subtitle"
  | "eyebrow"
  | "body"
  | "bullets"
  | "stat-display"
  | "stat-value"
  | "stat-value-mid"
  | "stat-value-small"
  | "stat-label"
  | "quote"
  | "quote-accent"
  | "attribution"
  | "card-surface"
  | "card-eyebrow"
  | "card-title"
  | "card-body"
  | "chrome-left"
  | "chrome-right"
  | "footer"
  | "divider"
  | "accent-bar"
  | "marker"
  | "image";

/**
 * The subset of ElementRole that a FlexRegion item can carry.
 *
 * `emitRelativeElement` handles dividers / accent-bars / markers as
 * shape primitives and routes every other role through the text path
 * (with role-specific style + fontRole resolution). It explicitly does
 * NOT render `image` (no `<Anuma.Image>` emit path for rels) or
 * `card-surface` (cards paint their surface via `cardItems: true` on
 * the region, not via a per-rel role). Narrowing the type here makes
 * those two roles uncompilable inside a flex item — so the silent-
 * misrender case (rel.role="image" rendering as zero-size Text) can't
 * be constructed.
 */
type RelativeElementRole = Exclude<ElementRole, "image" | "card-surface">;

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
  fontFamily: "heading" | "body" | (string & {});
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
  x: number;
  y: number;
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
interface RelativeElement {
  /** Slot id pattern. `${index}` is replaced with the 1-based item index. */
  id: string;
  /**
   * One of the roles the flex emitter actually renders. Excludes "image"
   * (no flex-item Image emit path) and "card-surface" (cards paint their
   * surface via `cardItems: true` on the region, not via a per-rel role).
   * The type narrows what `ElementRole` would otherwise advertise so
   * those silent-misrender cases can't be constructed.
   */
  role: RelativeElementRole;
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
 * Default content for ONE item inside a FlexRegion. String values are the
 * text for each RelativeElement (keyed by rel.id). The optional `surface`
 * key is reserved — it overrides the region's surface state for THIS
 * item, so a single grid can mix neutral/dark/accent cards without a new
 * composition. RelativeElement ids must never be literally "surface".
 */
type FlexItemDefault = {
  [key: string]: (string & {}) | SurfaceState | undefined;
  surface?: SurfaceState;
};

/**
 * A repeating flex region inside a composition. The region's own frame
 * is fixed (x/y/w/h), but it hosts a variable number of items rendered
 * as an `<Anuma.Group layout="row" | "column">`. Each item is one
 * realisation of the `item` template — same role pattern, sequential
 * slot ids (`agenda_1_title`, `agenda_2_title`, …). Use this for agendas,
 * bullet lists, dynamic card grids, timeline rows.
 */
interface FlexRegion {
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
  /**
   * Inner padding around an item's sub-elements, in canvas-percent. Used
   * with `cardItems` to inset text content from the card's painted edge
   * — otherwise eyebrow + title sit flush against the corner.
   */
  itemPadding?: number;
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
   * Grid mode: when set, items lay out in a 2-D grid with `columns` items
   * per row, items flowing row-major. The outer container becomes a flex
   * column whose children are row-flex groups; each row-flex group holds
   * up to `columns` item-groups. `gap` becomes the inter-row gap; the
   * inter-column gap inside each row falls back to `gap` unless
   * `columnGap` is set explicitly. When undefined, the region uses the
   * standard 1-D layout determined by `layout`.
   */
  columns?: number;
  /** Inter-column gap inside each row when `columns` is set. Defaults to `gap`. */
  columnGap?: number;
  /**
   * Card-style items: when true, each item-group paints its own
   * card-surface fill (resolved from the design system's card-surface
   * role under the item's surface state) and `cornerRadius={0.3}`. Use
   * for MARKETING_GRID-style card grids where the item IS the card; the
   * item template should then carry text rels only (no `card-surface`
   * rel). Per-item surface variety travels on FlexItemDefault.surface.
   */
  cardItems?: boolean;
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
  surfaces: {
    dark: {
      background: "#231A0F",
      overrides: {
        hero: { color: "slideBg" },
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
      background: "#B85A2E",
      overrides: {
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

const SANS = "Inter";

const TECHNO_BOLD: DesignSystem = {
  name: "techno-bold",
  useFor:
    "product launches, dev tools, fintech, AI infrastructure — confident technical voice with high-contrast modern typography.",
  defaultBackground: "#FAFAFA",
  accent: { base: "#3B82F6", onDark: "#60A5FA" },
  composition: {
    preferAsymmetric: true,
    preferDarkVariants: true,
  },
  styles: {
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

const CORPORATE_SERIF = "Source Serif 4";
const PLEX_MONO = "IBM Plex Mono";

export const CORPORATE_MODERN: DesignSystem = {
  name: "corporate-modern",
  useFor:
    "enterprise B2B, financial services, professional services, board decks — restrained institutional voice with serif body and mono chrome (white-paper register); brand-color accent appears only on chrome (eyebrows, markers, accent-bar) so the headline stays monochrome.",
  defaultBackground: "#FFFFFF",
  accent: { base: "#1E40AF", onDark: "#60A5FA" },
  composition: {
    preferAsymmetric: false,
    preferDarkVariants: false,
  },
  styles: {
    hero: {
      fontFamily: CORPORATE_SERIF,
      fontSize: 6.0,
      fontWeight: 600,
      color: "#18181B",
      lineHeight: 1.05,
      letterSpacing: -0.02,
      align: "left",
    },
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
    "card-surface": { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#FAFAFA" },
    divider: { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#E4E4E7" },
    "accent-bar": { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#1E40AF" },
    marker: { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#1E40AF" },
    image: { fontFamily: CORPORATE_SERIF, fontSize: 0, color: "#D4D4D8" },
  },
  surfaces: {
    dark: {
      background: "#18181B",
      overrides: {
        hero: { color: "#F4F4F5" },
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

const COZY_SANS = "Nunito";
const COZY_ACCENT = "#EA580C";
const COZY_TEXT = "#1C1917";
const COZY_BODY = "#57534E";
const COZY_MUTED = "#78716C";

const PLAYFUL_CREATIVE: DesignSystem = {
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
    hero: {
      fontFamily: COZY_SANS,
      fontSize: 6.0,
      fontWeight: 700,
      color: COZY_TEXT,
      lineHeight: 1.1,
      letterSpacing: -0.015,
      align: "left",
    },
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
    "card-surface": { fontFamily: COZY_SANS, fontSize: 0, color: "#FFEDD5" },
    divider: { fontFamily: COZY_SANS, fontSize: 0, color: "#E7E5E4" },
    "accent-bar": { fontFamily: COZY_SANS, fontSize: 0, color: COZY_ACCENT },
    marker: { fontFamily: COZY_SANS, fontSize: 0, color: COZY_ACCENT },
    image: { fontFamily: COZY_SANS, fontSize: 0, color: "#FFEDD5" },
  },
  surfaces: {
    dark: {
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
    hero: {
      fontFamily: SWISS_SANS,
      fontSize: 6.0,
      fontWeight: 900,
      color: "#0A0A0A",
      lineHeight: 1.05,
      letterSpacing: -0.02,
      align: "left",
    },
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
    "card-surface": { fontFamily: SWISS_SANS, fontSize: 0, color: "#F5F5F5" },
    divider: { fontFamily: SWISS_SANS, fontSize: 0, color: "#E5E5E5" },
    "accent-bar": { fontFamily: SWISS_SANS, fontSize: 0, color: "#DC2626" },
    marker: { fontFamily: SWISS_SANS, fontSize: 0, color: "#DC2626" },
    image: { fontFamily: SWISS_SANS, fontSize: 0, color: "#F5F5F5" },
  },
  surfaces: {
    dark: {
      background: "#0A0A0A",
      overrides: {
        hero: { color: "#FAFAFA" },
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

const LUXURY_SERIF = "DM Serif Display";
const LUXURY_SANS = "Raleway";

const LUXURY_EDITORIAL: DesignSystem = {
  name: "luxury-editorial",
  useFor:
    "boutique fashion, hospitality, cosmetics, fragrance, jewelry, premium-product brand decks — quiet confident luxury via thin elegant sans, fashion-magazine serif, generous chrome tracking, and a muted dusty-blush accent. Reach for it when the deck should feel expensive but restrained, not loud-premium.",
  defaultBackground: "#F5F5F4",
  accent: { base: "#BE8B6E", onDark: "#D4A88A" },
  composition: {
    preferAsymmetric: true,
    preferDarkVariants: false,
  },
  styles: {
    hero: {
      fontFamily: LUXURY_SERIF,
      fontSize: 5.5,
      fontWeight: 400,
      color: "#1F2937",
      lineHeight: 1.1,
      letterSpacing: -0.01,
      align: "left",
    },
    "hero-accent": {
      fontFamily: LUXURY_SERIF,
      fontSize: 5.5,
      fontWeight: 400,
      fontStyle: "italic",
      color: "#BE8B6E",
      lineHeight: 1.1,
      letterSpacing: -0.01,
      align: "left",
    },
    subtitle: {
      fontFamily: LUXURY_SANS,
      fontSize: 1.8,
      fontWeight: 300,
      color: "#4B5563",
      lineHeight: 1.45,
      letterSpacing: 0.02,
      align: "left",
    },
    eyebrow: {
      fontFamily: LUXURY_SANS,
      fontSize: 1.05,
      fontWeight: 500,
      color: "#BE8B6E",
      textTransform: "uppercase",
      letterSpacing: 0.28,
      align: "left",
    },
    body: {
      fontFamily: LUXURY_SANS,
      fontSize: 1.55,
      fontWeight: 300,
      color: "#4B5563",
      lineHeight: 1.7,
      align: "left",
    },
    bullets: {
      fontFamily: LUXURY_SANS,
      fontSize: 1.55,
      fontWeight: 300,
      color: "#4B5563",
      lineHeight: 1.75,
      align: "left",
    },
    "stat-display": {
      fontFamily: LUXURY_SERIF,
      fontSize: 13.5,
      fontWeight: 400,
      color: "#1F2937",
      lineHeight: 1.0,
      letterSpacing: -0.02,
      align: "left",
    },
    "stat-value": {
      fontFamily: LUXURY_SERIF,
      fontSize: 8.5,
      fontWeight: 400,
      color: "#1F2937",
      lineHeight: 1.0,
      letterSpacing: -0.01,
      align: "left",
    },
    "stat-value-mid": {
      fontFamily: LUXURY_SERIF,
      fontSize: 5.5,
      fontWeight: 400,
      color: "#1F2937",
      lineHeight: 1.0,
      align: "left",
    },
    "stat-value-small": {
      fontFamily: LUXURY_SERIF,
      fontSize: 3.4,
      fontWeight: 400,
      color: "#1F2937",
      lineHeight: 1.0,
      align: "left",
    },
    "stat-label": {
      fontFamily: LUXURY_SANS,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#6B7280",
      textTransform: "uppercase",
      letterSpacing: 0.24,
      align: "left",
    },
    quote: {
      fontFamily: LUXURY_SERIF,
      fontSize: 3.4,
      fontWeight: 400,
      color: "#1F2937",
      lineHeight: 1.35,
      align: "left",
    },
    "quote-accent": {
      fontFamily: LUXURY_SERIF,
      fontSize: 3.4,
      fontWeight: 400,
      fontStyle: "italic",
      color: "#BE8B6E",
      lineHeight: 1.35,
      align: "left",
    },
    attribution: {
      fontFamily: LUXURY_SANS,
      fontSize: 1.35,
      fontWeight: 500,
      color: "#1F2937",
      letterSpacing: 0.06,
      align: "left",
    },
    "card-eyebrow": {
      fontFamily: LUXURY_SANS,
      fontSize: 0.95,
      fontWeight: 500,
      color: "#BE8B6E",
      textTransform: "uppercase",
      letterSpacing: 0.24,
      align: "left",
    },
    "card-title": {
      fontFamily: LUXURY_SERIF,
      fontSize: 2.0,
      fontWeight: 400,
      color: "#1F2937",
      lineHeight: 1.25,
      align: "left",
    },
    "card-body": {
      fontFamily: LUXURY_SANS,
      fontSize: 1.4,
      fontWeight: 300,
      color: "#4B5563",
      lineHeight: 1.6,
      align: "left",
    },
    "chrome-left": {
      fontFamily: LUXURY_SANS,
      fontSize: 1.05,
      fontWeight: 500,
      color: "#1F2937",
      textTransform: "uppercase",
      letterSpacing: 0.28,
      align: "left",
    },
    "chrome-right": {
      fontFamily: LUXURY_SANS,
      fontSize: 1.0,
      fontWeight: 500,
      color: "#6B7280",
      textTransform: "uppercase",
      letterSpacing: 0.28,
      align: "right",
    },
    footer: {
      fontFamily: LUXURY_SANS,
      fontSize: 0.85,
      fontWeight: 500,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 0.22,
      align: "left",
    },
    "card-surface": { fontFamily: LUXURY_SANS, fontSize: 0, color: "#FAFAF9" },
    divider: { fontFamily: LUXURY_SANS, fontSize: 0, color: "#E7E5E4" },
    "accent-bar": { fontFamily: LUXURY_SANS, fontSize: 0, color: "#BE8B6E" },
    marker: { fontFamily: LUXURY_SANS, fontSize: 0, color: "#BE8B6E" },
    image: { fontFamily: LUXURY_SANS, fontSize: 0, color: "#E7E5E4" },
  },
  surfaces: {
    dark: {
      background: "#1F2937",
      overrides: {
        hero: { color: "#F5F5F4" },
        "hero-accent": { color: "#D4A88A" },
        subtitle: { color: "#9CA3AF" },
        eyebrow: { color: "#D4A88A" },
        body: { color: "#D1D5DB" },
        bullets: { color: "#D1D5DB" },
        "stat-display": { color: "#F5F5F4" },
        "stat-value": { color: "#F5F5F4" },
        "stat-value-mid": { color: "#F5F5F4" },
        "stat-value-small": { color: "#F5F5F4" },
        "stat-label": { color: "#9CA3AF" },
        quote: { color: "#F5F5F4" },
        "quote-accent": { color: "#D4A88A" },
        attribution: { color: "#F5F5F4" },
        "card-eyebrow": { color: "#D4A88A" },
        "card-title": { color: "#F5F5F4" },
        "card-body": { color: "#D1D5DB" },
        "chrome-left": { color: "#F5F5F4" },
        "chrome-right": { color: "#9CA3AF" },
        footer: { color: "#6B7280" },
        divider: { color: "#374151" },
      },
    },
    accent: {
      background: "#BE8B6E",
      overrides: {
        hero: { color: "#FFFFFF" },
        "hero-accent": { color: "#FFFFFF" },
        subtitle: { color: "#FAE9DC" },
        eyebrow: { color: "#FFFFFF" },
        body: { color: "#FAE9DC" },
        bullets: { color: "#FAE9DC" },
        "stat-display": { color: "#FFFFFF" },
        "stat-value": { color: "#FFFFFF" },
        "stat-value-mid": { color: "#FFFFFF" },
        "stat-value-small": { color: "#FFFFFF" },
        "stat-label": { color: "#FAE9DC" },
        quote: { color: "#FFFFFF" },
        "quote-accent": { color: "#FFFFFF" },
        attribution: { color: "#FFFFFF" },
        "card-eyebrow": { color: "#FFFFFF" },
        "card-title": { color: "#FFFFFF" },
        "card-body": { color: "#FAE9DC" },
        footer: { color: "#FAE9DC" },
      },
    },
  },
};

const COVER_SPLIT_PORTRAIT: LayoutComposition = {
  name: "cover-split-portrait",
  description:
    "Dark warm cover: text panel on the left half, full-bleed image on the right. The hero is three positioned lines — regular / italic-accent / regular — each occupying its own emotional moment. Brand chrome top, hairline footer bottom.",
  surface: "dark",
  elements: [
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
    {
      id: "body",
      role: "body",
      x: 6,
      y: 79,
      w: 40,
      h: 12,
      fit: "multi-line",
      defaultText: "Direct-trade espresso, roasted to your dial. Studio, café, and hotel formats.",
    },
    {
      id: "footer_rule",
      role: "divider",
      x: 6,
      y: 94,
      w: 40,
      h: 0,
    },
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 96,
      w: 40,
      h: 2.5,
      fit: "single-line",
      defaultText: "CONFIDENTIAL · WHOLESALE PARTNERS ONLY · 2026 PRICING",
    },
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

export const COVER_STATEMENT: LayoutComposition = {
  name: "cover-statement",
  description:
    "Dark text-only cover for statement-led decks (dev tools, B2B, infra). Two-line hero across the full canvas — regular line + accent line — followed by a 60%-wide body description and a four-column footer rail that surfaces the deck's headline facts. No image slot.",
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
      defaultText: "SERIES B · PREVIEW 2026",
    },
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
    {
      kind: "flex-region",
      idPrefix: "facts",
      x: 6,
      y: 88,
      w: 88,
      h: 11,
      layout: "row",
      itemLayout: "column",
      itemGap: 1,
      itemAlign: "start",
      item: [
        { id: "label", role: "stat-label", fit: "single-line" },
        { id: "value", role: "card-title", fit: "single-line" },
      ],
      defaultItems: [
        { label: "RAISING", value: "$25M Series B" },
        { label: "STAGE", value: "Post-revenue" },
        { label: "COVERAGE", value: "300+ techniques" },
        { label: "WEBSITE", value: "aegis.run" },
      ],
    },
  ],
};

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

const PROBLEM_EVIDENCE: LayoutComposition = {
  name: "problem-evidence",
  description:
    "Dark research-backed problem slide. Section chrome top-left, a 3-line wrapped hero with an inline accent stat (a number embedded in the sentence), and a source-citation line directly under the hero. Three stat cards below — each with eyebrow / big stat / supporting body / source citation. For investor/credible problem framing where evidence has to carry the slide.",
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
      defaultText: "01 / PROBLEM",
    },
    {
      id: "hero",
      role: "hero",
      x: 6,
      y: 13,
      w: 88,
      h: 37,
      fit: "multi-line",
      defaultText: "Engineering orgs spend *62%* of capacity on work that isn't shipping.",
    },
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
      "LINEARB BENCHMARKS 2024"
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
      "BLS OEWS · INT. MODEL"
    ),
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 96,
      w: 60,
      h: 3,
      fit: "single-line",
      defaultText: "FORGE AI · SERIES A · 02 / 16",
    },
  ],
};

const HEADLINE_NUMBER: LayoutComposition = {
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
    {
      id: "subhead",
      role: "subtitle",
      x: 6,
      y: 62,
      w: 62,
      h: 18,
      fit: "multi-line",
      defaultText: "Series A · led by an AI-native fund with deep dev-tools distribution.",
    },
    {
      id: "rail_rule",
      role: "divider",
      x: 6,
      y: 84,
      w: 88,
      h: 0,
    },
    {
      kind: "flex-region",
      idPrefix: "meta",
      x: 6,
      y: 86,
      w: 88,
      h: 10,
      layout: "row",
      itemLayout: "column",
      itemGap: 1,
      itemAlign: "start",
      item: [
        { id: "label", role: "stat-label", fit: "single-line" },
        { id: "value", role: "body", fit: "single-line" },
      ],
      defaultItems: [
        { label: "STRUCTURE", value: "$30M primary · $10M secondary" },
        { label: "BOARD", value: "1 lead · 2 founder · 1 indep" },
        { label: "TIMELINE", value: "Target: *May 30, 2026*" },
      ],
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
    { id: "rows_rule", role: "divider", x: 6, y: 50, w: 88, h: 0 },
    {
      kind: "flex-region",
      idPrefix: "agenda",
      x: 6,
      y: 52,
      w: 88,
      h: 42,
      layout: "column",
      gap: 0.75,
      justify: "start",
      align: "stretch",
      separator: true,
      itemLayout: "row",
      itemGap: 2,
      itemAlign: "baseline",
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

export const MARKETING_GRID: LayoutComposition = {
  name: "marketing-grid",
  description:
    "Light slide with a 2-line hero on top and a card grid below. Each card declares its own surface state (default / dark / accent), so a single grid can mix neutral, dark-emphasized, and brand-accent cards. The grid accepts a variable number of cards (typically 3–6) flowing across two columns.",
  elements: [
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
    {
      kind: "flex-region",
      idPrefix: "cards",
      x: 6,
      y: 52,
      w: 88,
      h: 46,
      layout: "column",
      columns: 2,
      gap: 2,
      columnGap: 4,
      cardItems: true,
      itemLayout: "column",
      itemGap: 1,
      itemPadding: 2,
      itemAlign: "start",
      item: [
        { id: "eyebrow", role: "card-eyebrow", fit: "single-line" },
        { id: "title", role: "card-title", fit: "multi-line", grow: 1 },
      ],
      defaultItems: [
        {
          surface: "default",
          eyebrow: "01 · BRAND FUND",
          title: "National creative + paid social + influencer cohort. We produce, you translate.",
        },
        {
          surface: "default",
          eyebrow: "02 · TECH STACK",
          title:
            "Unified POS + KDS + inventory + loyalty app + financial dashboard. One log-in, no per-seat fees.",
        },
        {
          surface: "dark",
          eyebrow: "03 · LAUNCH PACKAGE",
          title:
            "$8,000 grand-opening kit: geo-targeted ads, sample drops, KOL/KOC seeding, day-1 PR notes.",
        },
        {
          surface: "accent",
          eyebrow: "04 · OPERATOR SUPPORT",
          title:
            "Regional ops manager, 24/7 hotline, quarterly P&L review, semi-annual compliance audit.",
        },
      ],
    },
  ],
};

const FOUNDER_QUOTE_PORTRAIT: LayoutComposition = {
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
    { id: "image", role: "image", x: 6, y: 14, w: 38, h: 70 },
    {
      id: "image_caption",
      role: "stat-label",
      x: 6,
      y: 86,
      w: 38,
      h: 3,
      fit: "single-line",
      defaultText: "ANNA KIM · CEO · BERLIN 2024",
    },
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
  const headerHeight = 9;
  const rowHeight = (h - headerHeight) / rowCount;
  const cellPadX = 0.5;
  const cellPadY = 0.25;

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

  options.rows.forEach((row, rowIdx) => {
    const rowY = y + headerHeight + rowIdx * rowHeight;

    elements.push({
      id: `${id}_r${rowIdx}_rule`,
      role: "divider",
      x,
      y: rowY,
      w,
      h: 0,
    });

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

    row.values.forEach((value, valueIdx) => {
      const cellColIdx = valueIdx + 1;
      if (cellColIdx >= colCount) return;
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

const SURFACE_PAIR: LayoutComposition = {
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
    { id: "image", role: "image", x: 6, y: 14, w: 38, h: 80 },
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
    { id: "audience_rule", role: "divider", x: 50, y: 76, w: 44, h: 0 },
    {
      kind: "flex-region",
      idPrefix: "audience",
      x: 50,
      y: 80,
      w: 44,
      h: 14,
      layout: "row",
      itemLayout: "column",
      itemGap: 1,
      itemAlign: "start",
      item: [
        { id: "value", role: "card-title", fit: "single-line" },
        { id: "label", role: "stat-label", fit: "single-line" },
      ],
      defaultItems: [
        { value: "$149", label: "AVG SPEND" },
        { value: "3.1×", label: "VISITS / WK" },
        { value: "73%", label: "RETENTION" },
        { value: "6–9p", label: "PEAK HOURS" },
      ],
    },
  ],
};

export const BRAND_STORY_SPLIT: LayoutComposition = {
  name: "brand-story-split",
  description:
    "Light slide: image on the right, narrative on the left. Eyebrow + 3-line hero (last line is italic-accent) + body paragraph + hairline + 3-stat row at the bottom. For brand-story / founder-narrative slides where one image carries the tone.",
  elements: [
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
    { id: "proof_rule", role: "divider", x: 6, y: 84, w: 44, h: 0 },
    {
      kind: "flex-region",
      idPrefix: "proof",
      x: 6,
      y: 86,
      w: 44,
      h: 12,
      layout: "row",
      itemLayout: "column",
      itemGap: 1,
      itemAlign: "start",
      item: [
        { id: "value", role: "card-title", fit: "single-line" },
        { id: "label", role: "stat-label", fit: "single-line" },
      ],
      defaultItems: [
        { value: "41", label: "BOUTIQUES" },
        { value: "4", label: "CITIES" },
        { value: "78%", label: "REPEAT BUYERS" },
      ],
    },
    { id: "image", role: "image", x: 52, y: 18, w: 42, h: 76 },
  ],
};

const MULTI_STAT_ASYMMETRIC: LayoutComposition = {
  name: "multi-stat-asymmetric",
  description:
    "Light slide: hero + body on the left, anchor-stat panel (dark) on the right, 3 supporting stat cards across the bottom — two on the default surface, one on the accent surface for emphasis. For 'why this matters / how big the market is' slides.",
  elements: [
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
      "annual deliveries."
    ),
  ],
};

const PEER_COMPARISON_TABLE: LayoutComposition = {
  name: "peer-comparison-table",
  description:
    "Light slide: 2-line hero with inline italic accent + a data table comparing our terms to N peer composites. The 'us' column is highlighted as a dark-surface stripe running the full table height. Use for pricing, terms, or spec comparisons.",
  elements: [
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
    ...table("terms", 6, 46, 88, 46, {
      headers: [
        { label: "FRANCHISE TERM" },
        { label: "SOURDOUGH CO", sublabel: "Bakery · 45 m²", highlight: true },
        { label: "PEER · A", sublabel: "Artisan, U.S." },
        { label: "PEER · B", sublabel: "Patisserie, EU" },
        { label: "PEER · C", sublabel: "Café, AU" },
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
    {
      id: "footer",
      role: "footer",
      x: 6,
      y: 96,
      w: 88,
      h: 3,
      fit: "single-line",
      defaultText: "PEER COLUMNS ARE ILLUSTRATIVE COMPOSITES · NOT LEGAL ADVICE",
    },
  ],
};

const CANVAS_W = 960;
const CANVAS_H = 540;
const pxX = (pct: number) => round2(pct * (CANVAS_W / 100));
const pxY = (pct: number) => round2(pct * (CANVAS_H / 100));
const pxFontSize = (pct: number) => round2(pct * (CANVAS_W / 100));
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveFontFamily(family: string, fontPreset: { heading: string; body: string }): string {
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

function resolveStyle(system: DesignSystem, role: ElementRole, state: SurfaceState): RoleStyle {
  const base = system.styles[role];
  if (!base) throw new Error(`Design system "${system.name}" missing style for role "${role}"`);
  if (state === "default") return base;
  const treatment = system.surfaces?.[state];
  const override = treatment?.overrides[role];
  return override ? { ...base, ...override } : base;
}

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

function accentRoleFor(role: ElementRole): ElementRole | null {
  if (role === "hero") return "hero-accent";
  if (role === "quote") return "quote-accent";
  return null;
}

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
  const spanProps: string[] = [];
  if (accentStyle.fontStyle) spanProps.push(`fontStyle: "${accentStyle.fontStyle}"`);
  if (accentStyle.color) spanProps.push(`color: "${accentStyle.color}"`);
  const spanStyle = `{{ ${spanProps.join(", ")} }}`;
  const parts: string[] = [];
  let lastIndex = 0;
  const re = /\*{1,2}([^*]+)\*{1,2}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeText(text.slice(lastIndex, match.index)));
    }
    parts.push(`<Anuma.Span style=${spanStyle}>${escapeText(match[1])}</Anuma.Span>`);
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

/**
 * Sentinel placeholder emitted when compile() runs in `"sentinel"` mode
 * (e.g. for recipes shipped to the model). The model is expected to
 * replace this with a real image URL (attached:N or generated) or to
 * remove the element entirely if no image is available. It is not a
 * real URL by design — the previous `placehold.co` URL looked real
 * enough that the model frequently copied it verbatim into production
 * decks.
 *
 * Policy: add_slide auto-strips <Anuma.Image> elements whose src still
 * holds this sentinel (see stripSentinelImages in jsx.ts) — a partial
 * deck with the image dropped is more useful than a wholesale rejection.
 */
export const IMAGE_PLACEHOLDER_SENTINEL = "REPLACE_WITH_IMAGE_OR_REMOVE";

function emitImage(
  el: CompositionElement,
  system: DesignSystem,
  state: SurfaceState,
  imageSrcMode: "placeholder" | "sentinel"
): string {
  if (imageSrcMode === "sentinel") {
    const src = el.defaultSrc ?? IMAGE_PLACEHOLDER_SENTINEL;
    return `<Anuma.Image id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} src="${escapeText(src)}" />`;
  }
  const isLight = state === "default";
  const bgHex = isLight ? "#E5E5E5" : (surfaceBackground(system, state) ?? "#1a1a1a");
  const stripHash = (s: string) => s.replace(/^#/, "");
  const src =
    el.defaultSrc ?? `https://placehold.co/1200x1200/${stripHash(bgHex)}/${stripHash(bgHex)}`;
  return `<Anuma.Image id="${el.id}" x={${pxX(el.x)}} y={${pxY(el.y)}} w={${pxX(el.w)}} h={${pxY(el.h)}} src="${escapeText(src)}" />`;
}

function emitFlexRegion(
  region: FlexRegion,
  system: DesignSystem,
  slideState: SurfaceState,
  fontPreset: { heading: string; body: string }
): string {
  const itemState: SurfaceState = region.surface ?? slideState;
  const isGrid = region.columns !== undefined && region.columns > 0;
  const outerLayout = isGrid ? "column" : region.layout;
  const layoutAttrs: string[] = [
    `layout="${outerLayout}"`,
    ...(region.gap !== undefined ? [`gap={${pxY(region.gap)}}`] : []),
    ...(region.padding !== undefined ? [`padding={${pxY(region.padding)}}`] : []),
    ...(region.justify ? [`justify="${region.justify}"`] : []),
    ...(region.align ? [`align="${region.align}"`] : []),
  ];
  const innerLayout = region.itemLayout ?? "row";
  const innerAttrs: string[] = [
    `layout="${innerLayout}"`,
    ...(region.itemGap !== undefined ? [`gap={${pxY(region.itemGap)}}`] : []),
    ...(region.itemPadding !== undefined ? [`padding={${pxY(region.itemPadding)}}`] : []),
    ...(region.itemJustify ? [`justify="${region.itemJustify}"`] : []),
    ...(region.itemAlign ? [`align="${region.itemAlign}"`] : []),
  ];
  const separatorStyle = region.separator ? resolveStyle(system, "divider", itemState) : null;

  if (isGrid) {
    const columns = region.columns!;
    const colGap = region.columnGap ?? region.gap;
    const rowAttrs: string[] = [
      `layout="row"`,
      ...(colGap !== undefined ? [`gap={${pxY(colGap)}}`] : []),
    ];
    const rowGroups: string[] = [];
    for (let r = 0; r * columns < region.defaultItems.length; r++) {
      const rowItems: string[] = [];
      for (let c = 0; c < columns; c++) {
        const i = r * columns + c;
        if (i >= region.defaultItems.length) break;
        rowItems.push(
          emitFlexItem(
            region,
            i + 1,
            region.defaultItems[i],
            system,
            itemState,
            fontPreset,
            innerAttrs,
            "row"
          )
        );
      }
      rowGroups.push(`<Anuma.Group ${rowAttrs.join(" ")} grow={1}>
${rowItems.join("\n")}
</Anuma.Group>`);
    }
    return `<Anuma.Group id="${region.idPrefix}" x={${pxX(region.x)}} y={${pxY(region.y)}} w={${pxX(region.w)}} h={${pxY(region.h)}} ${layoutAttrs.join(" ")}>
${rowGroups.join("\n")}
</Anuma.Group>`;
  }

  const itemParts: string[] = [];
  for (let i = 0; i < region.defaultItems.length; i++) {
    itemParts.push(
      emitFlexItem(region, i + 1, region.defaultItems[i], system, itemState, fontPreset, innerAttrs)
    );
    if (separatorStyle) {
      itemParts.push(emitFlexSeparator(region, i + 1, separatorStyle));
    }
  }
  return `<Anuma.Group id="${region.idPrefix}" x={${pxX(region.x)}} y={${pxY(region.y)}} w={${pxX(region.w)}} h={${pxY(region.h)}} ${layoutAttrs.join(" ")}>
${itemParts.join("\n")}
</Anuma.Group>`;
}

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
  innerAttrs: string[],
  parentLayout?: "row" | "column"
): string {
  const itemState: SurfaceState = data.surface ?? state;
  const children = region.item
    .map((rel) => emitRelativeElement(region, rel, index, data, system, itemState, fontPreset))
    .join("\n");
  const itemId = `${region.idPrefix}_${index}`;
  const parent = parentLayout ?? region.layout;
  const baseAttrs = parent === "row" ? [...innerAttrs, "grow={1}"] : innerAttrs;
  const surfaceAttrs: string[] = [];
  if (region.cardItems) {
    const fill =
      itemState === "default"
        ? system.styles["card-surface"].color
        : (surfaceBackground(system, itemState) ?? "#1a1a1a");
    surfaceAttrs.push(`fill="${fill}"`, "cornerRadius={0.3}");
  }
  const itemAttrs = [...baseAttrs, ...surfaceAttrs];
  return `<Anuma.Group id="${itemId}" ${itemAttrs.join(" ")}>
${children}
</Anuma.Group>`;
}

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
  const sizePrefix = sizeAttrs.length > 0 ? ` ${sizeAttrs.join(" ")}` : "";
  if (rel.role === "divider") {
    return `<Anuma.Line id="${id}"${sizePrefix} stroke="${s.color}" strokeWidth={1} />`;
  }
  if (rel.role === "accent-bar") {
    return `<Anuma.Rect id="${id}"${sizePrefix} fill="${s.color}" cornerRadius={0.2} />`;
  }
  if (rel.role === "marker") {
    return `<Anuma.Circle id="${id}"${sizePrefix} fill="${s.color}" />`;
  }
  const raw = data[rel.id];
  const text = (typeof raw === "string" ? raw : undefined) ?? rel.defaultText ?? "";
  const fontRole = s.fontFamily === "heading" ? "heading" : "body";
  const resolved = rel.align ? { ...s, align: rel.align } : s;
  const style = styleObject(resolved, fontPreset);
  const body = renderInlineAccents(text, rel.role, system, elState);
  return `<Anuma.Text id="${id}"${sizePrefix} fontRole="${fontRole}" style=${style}>${body}</Anuma.Text>`;
}

function emitCardSurface(
  el: CompositionElement,
  system: DesignSystem,
  state: SurfaceState
): string {
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
  const rewriteStyles = (map: Record<string, RoleStyle>): Record<string, RoleStyle> => {
    const out: Record<string, RoleStyle> = {};
    for (const [k, v] of Object.entries(map)) out[k] = rewriteStyle(v);
    return out;
  };
  const rewriteOverrides = (map: SurfaceTreatment["overrides"]): SurfaceTreatment["overrides"] => {
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

function lightenForDarkSurface(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
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
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
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
 *
 * `options.imageSrcMode` controls how `<Anuma.Image>` slots are filled:
 *   - "placeholder" (default): emits a surface-tinted placehold.co URL,
 *     useful for visual review of the catalog.
 *   - "sentinel": emits the literal `REPLACE_WITH_IMAGE_OR_REMOVE`
 *     string — used when the recipe is shipped to the model so it
 *     swaps in a real image URL or drops the element entirely.
 */
export function compile(
  composition: LayoutComposition,
  system: DesignSystem,
  fontPreset: { heading: string; body: string },
  slideId?: string,
  options?: { imageSrcMode?: "placeholder" | "sentinel" }
): string {
  const imageSrcMode = options?.imageSrcMode ?? "placeholder";
  const slideState: SurfaceState = composition.surface ?? "default";
  const lines: string[] = [];
  for (const child of composition.elements) {
    if (isFlexRegion(child)) {
      lines.push(emitFlexRegion(child, system, slideState, fontPreset));
      continue;
    }
    const el = child;
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
        lines.push(emitImage(el, system, elState, imageSrcMode));
        break;
      default:
        lines.push(emitText(el, s, fontPreset, system, elState));
    }
  }
  const bg = composition.backgroundColor ?? surfaceBackground(system, slideState);
  const bgAttr = bg ? ` background="${bg}"` : "";
  const id = slideId ?? composition.name;
  return `<Anuma.Slide id="${id}"${bgAttr}>\n${lines.join("\n")}\n</Anuma.Slide>`;
}

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
interface SlotBudget {
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

const CHAR_WIDTH_FACTOR = {
  mono: 0.6,
  serif: 0.48,
  sans: 0.52,
  sansBold: 0.56,
} as const;

function resolveFamily(style: RoleStyle, fontPreset: { heading: string; body: string }): string {
  if (style.fontFamily === "heading") return fontPreset.heading;
  if (style.fontFamily === "body") return fontPreset.body;
  return style.fontFamily;
}

function charWidthFactor(style: RoleStyle, fontPreset: { heading: string; body: string }): number {
  const family = resolveFamily(style, fontPreset).toLowerCase();
  let base: number;
  if (/mono|jetbrains|courier|menlo|consolas/.test(family)) {
    base = CHAR_WIDTH_FACTOR.mono;
  } else if (/serif|crimson|playfair|times|garamond|georgia|baskerville/.test(family)) {
    base = CHAR_WIDTH_FACTOR.serif;
  } else {
    const isBold = (style.fontWeight ?? 400) >= 600;
    base = isBold ? CHAR_WIDTH_FACTOR.sansBold : CHAR_WIDTH_FACTOR.sans;
  }
  if (style.textTransform === "uppercase") base *= 1.18;
  if (typeof style.letterSpacing === "number" && style.letterSpacing > 0) {
    base += style.letterSpacing;
  }
  return base;
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
      const isGrid = child.columns !== undefined && child.columns > 0;
      const shape = isGrid ? `grid, ${child.columns} columns` : `layout="${child.layout}"`;
      const shrinkHint = isGrid
        ? `In grid mode only height shrinks as more rows fill — per-item width stays roughly constant. Items in a trailing partial row stretch to full row width.`
        : `Budgets shrink roughly linearly with item count (½ budget at double the count). Keep counts low for tighter copy.`;
      out.push(
        `  Flex region ${child.idPrefix} — ${child.defaultItems.length} items by default, ${shape}. Add or remove items by changing the count of ${child.idPrefix}_<index>_<slot> ids you pass. ${shrinkHint}`
      );
      if (child.cardItems) {
        const surfaceMap = child.defaultItems
          .map((item, i) => {
            const s = typeof item.surface === "string" ? item.surface : "default";
            return `${child.idPrefix}_${i + 1}=${s}`;
          })
          .join(", ");
        out.push(
          `    Card surfaces: each item paints its own card-surface (fill + cornerRadius on the item-Group). Surface map: ${surfaceMap}. To add or vary a card, copy the matching existing item-Group — fill, cornerRadius, and per-surface text colors travel together.`
        );
      }
      for (const rel of child.item) {
        if (STATIC_ROLES.has(rel.role)) {
          out.push(
            `    - ${child.idPrefix}_<index>_${rel.id} [${rel.role}]: static element, no content`
          );
          continue;
        }
        const style = system.styles[rel.role];
        if (!style) continue;
        const budget = estimateRelativeSlotBudget(rel, child, style, fontPreset);
        const fit: FitMode = rel.fit ?? "multi-line";
        if (fit === "single-line") {
          out.push(
            `    - ${child.idPrefix}_<index>_${rel.id} [${rel.role}]: ≤ ${budget.charsPerLine} chars, ONE LINE.`
          );
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

function estimateRelativeSlotBudget(
  rel: RelativeElement,
  region: FlexRegion,
  style: RoleStyle,
  fontPreset: { heading: string; body: string },
  itemCountOverride?: number,
  itemIndex?: number
): SlotBudget {
  const padding = region.padding ?? 0;
  const gap = region.gap ?? 0;
  const itemCount = Math.max(1, itemCountOverride ?? region.defaultItems.length);
  let w = rel.w;
  let h = rel.h;
  if (region.columns !== undefined && region.columns > 0) {
    const cols = region.columns;
    const rows = Math.max(1, Math.ceil(itemCount / cols));
    const colGap = region.columnGap ?? gap;
    const lastRowFill = itemCount - cols * (rows - 1);
    const itemIsInLastRow = itemIndex !== undefined && itemIndex > cols * (rows - 1);
    const effectiveCols = itemIsInLastRow && lastRowFill < cols ? lastRowFill : cols;
    if (w === undefined) {
      w = (region.w - 2 * padding - colGap * Math.max(0, effectiveCols - 1)) / effectiveCols;
    }
    if (h === undefined) {
      h = (region.h - 2 * padding - gap * (rows - 1)) / rows;
    }
  } else if (region.layout === "row") {
    if (w === undefined) {
      w = (region.w - 2 * padding - gap * (itemCount - 1)) / itemCount;
    }
    if (h === undefined) {
      h = region.h - 2 * padding;
    }
  } else {
    if (w === undefined) {
      w = region.w - 2 * padding;
    }
    if (h === undefined) {
      h = (region.h - 2 * padding - gap * (itemCount - 1)) / itemCount;
    }
  }
  return estimateSlotBudget(
    { id: rel.id, role: rel.role, x: 0, y: 0, w, h, fit: rel.fit } as CompositionElement,
    style,
    fontPreset
  );
}

function validateFlexRegionDefaults(
  region: FlexRegion,
  system: DesignSystem,
  fontPreset: { heading: string; body: string }
): SlotIssue[] {
  const issues: SlotIssue[] = [];
  for (let i = 0; i < region.defaultItems.length; i++) {
    const data = region.defaultItems[i];
    const idx = i + 1;
    for (const rel of region.item) {
      if (STATIC_ROLES.has(rel.role)) continue;
      const style = system.styles[rel.role];
      if (!style) continue;
      const raw = data[rel.id];
      const text = (typeof raw === "string" ? raw : undefined) ?? rel.defaultText;
      if (!text) continue;
      const budget = estimateRelativeSlotBudget(rel, region, style, fontPreset, undefined, idx);
      const fit: FitMode = rel.fit ?? "multi-line";
      const trimmed = text.trim();
      const visible = trimmed.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1");
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
interface SlotIssue {
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
    const visibleText = text.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1");
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
  slide: {
    children: Array<
      { tag?: string; attrs?: Record<string, unknown>; children?: unknown[] } | string
    >;
  }
): SlotIssue[] {
  const issues: SlotIssue[] = [];
  const textsBySlotId = new Map<string, string>();
  collectSlideTexts(slide.children, textsBySlotId);
  for (const child of composition.elements) {
    if (isFlexRegion(child)) {
      const itemPattern = new RegExp(`^${escapeForRegex(child.idPrefix)}_(\\d+)_`);
      const discoveredIndices = new Set<number>();
      for (const slotId of textsBySlotId.keys()) {
        const m = slotId.match(itemPattern);
        if (m) discoveredIndices.add(parseInt(m[1], 10));
      }
      const actualCount =
        discoveredIndices.size > 0 ? discoveredIndices.size : child.defaultItems.length;
      const itemCountForBudget = actualCount;
      const indicesToCheck =
        discoveredIndices.size > 0
          ? [...discoveredIndices].sort((a, b) => a - b)
          : Array.from({ length: child.defaultItems.length }, (_, i) => i + 1);
      for (const idx of indicesToCheck) {
        for (const rel of child.item) {
          if (STATIC_ROLES.has(rel.role)) continue;
          const style = system.styles[rel.role];
          if (!style) continue;
          const fullId = `${child.idPrefix}_${idx}_${rel.id}`;
          const actual = textsBySlotId.get(fullId);
          if (actual === undefined) continue;
          const budget = estimateRelativeSlotBudget(
            rel,
            child,
            style,
            fontPreset,
            itemCountForBudget,
            idx
          );
          const fit: FitMode = rel.fit ?? "multi-line";
          const visibleText = actual.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").trim();
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
    const visibleText = actual.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").trim();
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

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

export const ALL_COMPOSITIONS: LayoutComposition[] = [
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

export const ALL_SYSTEMS: Array<{ name: string; system: DesignSystem }> = [
  { name: "editorial-warm", system: EDITORIAL_WARM },
  { name: "techno-bold", system: TECHNO_BOLD },
  { name: "corporate-modern", system: CORPORATE_MODERN },
  { name: "minimal-swiss", system: MINIMAL_SWISS },
  { name: "playful-creative", system: PLAYFUL_CREATIVE },
  { name: "luxury-editorial", system: LUXURY_EDITORIAL },
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
 * line per system with its name, `useFor` hint, and any composition
 * hints (preferAsymmetric / preferDarkVariants). The model picks the
 * system at plan_deck time by reading this list and matching the
 * deck's topic / register to one of the use cases.
 */
export function renderDesignSystemCatalog(): string {
  return ALL_SYSTEMS.map(({ name, system }) => {
    const hints: string[] = [];
    if (system.composition?.preferAsymmetric) hints.push("prefers asymmetric layouts");
    if (system.composition?.preferDarkVariants) hints.push("prefers dark-surface variants");
    const hintSuffix = hints.length > 0 ? ` [${hints.join(", ")}]` : "";
    return `- ${name} — ${system.useFor}${hintSuffix}`;
  }).join("\n");
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
  accent?: { base: string; onDark?: string },
  /**
   * When true, the recipe's image note advertises
   * AnumaMediaMCP-anuma_create_image as an option. When false (the
   * default), it tells the model the only valid path is attached:N or
   * removing the element. Pass `true` only when the host has the
   * AnumaMediaMCP-anuma_create_image tool bound to the same loop —
   * otherwise the model sees a tool-name it can't actually call.
   */
  hasImageGenerator?: boolean
): string | null {
  const resolved = resolveCompositionLayout(name);
  if (!resolved) return null;
  const system = accent ? applyAccent(resolved.system, accent) : resolved.system;
  const slideJsx = compile(resolved.composition, system, fontPreset, undefined, {
    imageSrcMode: "sentinel",
  });
  const slots = describeComposition(resolved.composition, system, fontPreset);
  const hasImage = resolved.composition.elements.some(
    (e) => !isFlexRegion(e) && e.role === "image"
  );
  let imageNote = "";
  if (hasImage) {
    const sourceClause = hasImageGenerator
      ? "Replace src with a real URL (attached:N reference, or a URL from AnumaMediaMCP-anuma_create_image)"
      : "Replace src with an attached:N reference if you have one";
    imageNote = `\n\nImage slots: <Anuma.Image src="${IMAGE_PLACEHOLDER_SENTINEL}"> is a placeholder. ${sourceClause} OR remove the <Anuma.Image> element entirely if no image is available. Never ship the literal sentinel string.`;
  }
  return `${name} — ${resolved.composition.description}

${slots}

Recipe (copy this slide JSX; substitute text content per slot — do not change x/y/w/h/style):

${slideJsx}${imageNote}`;
}
