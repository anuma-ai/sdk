/**
 * Backwards-compat for slide decks generated before the JSX migration.
 *
 * Older decks were persisted as JSON with a typed `SlideDeck` shape:
 *
 *   {
 *     version: 2,
 *     theme: { fontPreset, colors: { background, slideBg, ... } },
 *     slides: [{
 *       id, background?,
 *       elements: [{ kind: 'text'|'image'|'shape'|'icon', id, x, y, w, h, ... }],
 *     }],
 *   }
 *
 * Coordinates were percent-of-canvas (0..100). The new runtime stores
 * decks as `<Anuma.Deck>` JSX with pixel coordinates on a 960×540 slide.
 *
 * This module converts legacy JSON → an `AnumaNode` tree so consumers
 * can load old decks transparently and (if they want) re-serialise as
 * JSX to migrate the persisted form forward.
 */

import type { AnumaNode } from "./jsx.js";

// Slide canvas dimensions match the SLIDE_CANVAS_WIDTH / HEIGHT constants
// re-exported from `./index.ts`. Inlining them here keeps this module
// independent of the (much larger) tool-factory module — `./index.ts`
// imports `./legacy.ts`, not the other way round.
const REF_W = 960;
const REF_H = 540;

const round = (n: number): number => Math.round(n * 100) / 100;
const xPx = (pct: number): number => round((pct / 100) * REF_W);
const yPx = (pct: number): number => round((pct / 100) * REF_H);
const fsPx = (pct: number): number => round((pct / 100) * REF_W);

// ---------------------------------------------------------------------------
// Legacy schema (matches the old `apps/web/lib/legacy-slide-types.ts`)
// ---------------------------------------------------------------------------

interface LegacyTheme {
  fontPreset?: string;
  colors?: {
    background?: string;
    slideBg?: string;
    surfaceSecondary?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    accent?: string;
    card?: string;
    border?: string;
  };
}

interface LegacyBaseElement {
  id?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
}

interface LegacyTextElement extends LegacyBaseElement {
  kind: "text";
  text?: string;
  fontSize?: number;
  fontRole?: "heading" | "body";
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  fontStyle?: "italic" | "normal";
  textTransform?: "uppercase" | "none";
  fontFamily?: string;
}

interface LegacyImageElement extends LegacyBaseElement {
  kind: "image";
  src?: string;
  cornerRadius?: number;
}

interface LegacyShapeElement extends LegacyBaseElement {
  kind: "shape";
  shape?: "rect" | "circle" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

interface LegacyIconElement extends LegacyBaseElement {
  kind: "icon";
  name?: string;
  color?: string;
  fontSize?: number;
}

type LegacyElement =
  | LegacyTextElement
  | LegacyImageElement
  | LegacyShapeElement
  | LegacyIconElement;

interface LegacySlide {
  id?: string;
  background?: string;
  elements?: LegacyElement[];
}

/** Legacy persisted deck shape. `version: 2` was the only version that ever shipped. */
export interface LegacyDeckJson {
  version?: number;
  theme?: LegacyTheme;
  slides?: LegacySlide[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect whether `raw` looks like a legacy JSON deck. Cheap structural
 * check — used by callers that want to branch between `parseJsx` and
 * the legacy converter without throwing on every JSX parse attempt.
 *
 * Accepts a string (JSON-encoded) or a parsed object.
 */
export function isLegacyDeckJson(raw: unknown): raw is LegacyDeckJson {
  const obj = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!obj || typeof obj !== "object") return false;
  const o = obj as { theme?: unknown; slides?: unknown };
  return Array.isArray(o.slides) && typeof o.theme === "object" && o.theme !== null;
}

/**
 * Convert a legacy JSON deck (string or already-parsed object) into a
 * fresh `<Anuma.Deck>` AnumaNode tree. Returns null if the input
 * doesn't parse as JSON or doesn't look like the legacy shape.
 *
 * Defensive defaults match the constants in the deleted
 * `legacy-slide-types.ts`: undefined colors fall back to the original
 * dark theme, undefined elements get sensible numeric defaults so
 * partially-corrupted decks still render.
 */
export function convertLegacyDeckJson(raw: unknown): AnumaNode | null {
  const parsed = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!isLegacyDeckJson(parsed)) return null;
  return legacyDeckToAnuma(parsed);
}

// ---------------------------------------------------------------------------
// Conversion internals
// ---------------------------------------------------------------------------

const DEFAULT_COLORS: Required<NonNullable<LegacyTheme["colors"]>> = {
  background: "#222529",
  slideBg: "#1a1b1e",
  surfaceSecondary: "#1a1b1e",
  textPrimary: "#ffffff",
  textSecondary: "#ffffff",
  textMuted: "#9a9592",
  accent: "#e67519",
  card: "#1a1a21",
  border: "#434242",
};

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function legacyDeckToAnuma(deck: LegacyDeckJson): AnumaNode {
  const theme = deck.theme ?? {};
  const colors = { ...DEFAULT_COLORS, ...(theme.colors ?? {}) };
  const slides = (deck.slides ?? []).map(legacySlideToAnuma);
  return {
    tag: "Deck",
    attrs: {
      fontPreset: theme.fontPreset ?? "default",
      background: colors.background,
      slideBg: colors.slideBg,
      surfaceSecondary: colors.surfaceSecondary,
      textPrimary: colors.textPrimary,
      textSecondary: colors.textSecondary,
      textMuted: colors.textMuted,
      accent: colors.accent,
      card: colors.card,
      border: colors.border,
    },
    children: slides,
  };
}

function legacySlideToAnuma(slide: LegacySlide): AnumaNode {
  const attrs: Record<string, string | number | boolean> = {
    id: slide.id ?? "",
  };
  if (slide.background) attrs.background = slide.background;
  return {
    tag: "Slide",
    attrs,
    children: (slide.elements ?? []).map(legacyElementToAnuma),
  };
}

function baseGeometry(el: LegacyBaseElement): Record<string, number> {
  const out: Record<string, number> = {
    x: xPx(el.x ?? 0),
    y: yPx(el.y ?? 0),
    w: xPx(el.w ?? 0),
    h: yPx(el.h ?? 0),
  };
  if (el.rotation !== undefined) out.rotation = el.rotation;
  return out;
}

function legacyElementToAnuma(el: LegacyElement): AnumaNode {
  const base = baseGeometry(el);

  if (el.kind === "text") {
    const style: Record<string, string | number> = {
      fontSize: fsPx(el.fontSize ?? 18),
      fontWeight: el.fontWeight ?? 400,
      color: el.color ?? "textPrimary",
    };
    if (el.align !== undefined) style.textAlign = el.align;
    if (el.lineHeight !== undefined) style.lineHeight = el.lineHeight;
    if (el.letterSpacing !== undefined) style.letterSpacing = el.letterSpacing;
    if (el.fontStyle !== undefined) style.fontStyle = el.fontStyle;
    if (el.textTransform !== undefined) style.textTransform = el.textTransform;
    if (el.fontFamily !== undefined) style.fontFamily = el.fontFamily;
    return {
      tag: "Text",
      attrs: {
        id: el.id ?? "",
        ...base,
        fontRole: el.fontRole ?? "body",
        style,
      },
      children: [el.text ?? ""],
    };
  }

  if (el.kind === "image") {
    const attrs: Record<string, string | number | Record<string, string | number>> = {
      id: el.id ?? "",
      ...base,
      src: el.src ?? "",
    };
    if (el.cornerRadius !== undefined) attrs.style = { borderRadius: el.cornerRadius };
    return { tag: "Image", attrs, children: [] };
  }

  if (el.kind === "shape") {
    const tag = el.shape === "rect" ? "Rect" : el.shape === "circle" ? "Circle" : "Line";
    const attrs: Record<string, string | number> = { id: el.id ?? "", ...base };
    if (el.fill !== undefined) attrs.fill = el.fill;
    if (el.stroke !== undefined) attrs.stroke = el.stroke;
    if (el.strokeWidth !== undefined) attrs.strokeWidth = el.strokeWidth;
    if (el.cornerRadius !== undefined) attrs.cornerRadius = el.cornerRadius;
    return { tag, attrs, children: [] };
  }

  // icon
  return {
    tag: "Icon",
    attrs: {
      id: el.id ?? "",
      ...base,
      name: el.name ?? "",
      style: {
        color: el.color ?? "textPrimary",
        fontSize: fsPx(el.fontSize ?? 24),
      },
    },
    children: [],
  };
}
