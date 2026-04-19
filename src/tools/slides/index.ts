/**
 * Slide deck tools for LLM-driven presentation generation.
 *
 * Provides plan_slides, create_slides, read_slides, and patch_slides tool
 * configurations, along with the type system, coordinate helpers, font
 * presets, and system prompt that drive the slide generation flow.
 *
 * Slide decks are JSON documents persisted to a file named `slides.json`
 * via the shared `AppFileStorage` interface. The LLM plans the deck with
 * `plan_slides`, writes the full deck with `create_slides`, and applies
 * incremental edits with `patch_slides`. All positions use a
 * percentage-based coordinate system relative to a 960×540 (16:9)
 * reference canvas.
 *
 * When a `displaySlides` callback is supplied to `createSlideTools`, the
 * deck-display UI interaction is emitted automatically from inside
 * `create_slides` and `patch_slides` — no separate display tool needed.
 *
 * @example
 * ```typescript
 * import { createSlideTools, buildSlideSystemPrompt } from "@anuma/sdk/tools";
 *
 * const slideTools = createSlideTools({
 *   getConversationId,
 *   storage,
 *   displaySlides: async (args) => ({ ...args, displayType: "slides" }),
 * });
 *
 * await sendMessage({
 *   messages: [...],
 *   tools: slideTools,
 *   systemPrompt: buildSlideSystemPrompt(),
 * });
 * ```
 *
 * @module tools/slides
 */

import type { ToolConfig } from "../../lib/chat/useChat/types.js";
import type { AppFileStorage } from "../appGeneration";
import { renderElementKinds } from "./elementKinds";
import {
  getLayoutByName,
  renderLayoutCatalog,
  renderLayoutRecipes,
  renderSharedHeader,
} from "./layouts";
import { getPaletteByName, renderPaletteColors, renderPaletteNames } from "./palettes";

// ---------------------------------------------------------------------------
// Canvas reference dimensions (16:9)
// ---------------------------------------------------------------------------

export const REF_W = 960;
export const REF_H = 540;

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export interface SlideTheme {
  fontPreset: string;
  colors: {
    background: string;
    slideBg: string;
    surfaceSecondary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    card: string;
    border: string;
  };
}

export const DEFAULT_SLIDE_THEME: SlideTheme = {
  fontPreset: "default",
  colors: {
    background: "#222529",
    slideBg: "#1a1b1e",
    surfaceSecondary: "#1a1b1e",
    textPrimary: "#ffffff",
    textSecondary: "#ffffff",
    textMuted: "#9a9592",
    accent: "#e67519",
    card: "#1a1a21",
    border: "#434242",
  },
};

// ---------------------------------------------------------------------------
// Font presets
// ---------------------------------------------------------------------------

export interface FontPreset {
  heading: string;
  body: string;
  /** Semicolon-separated weights, e.g. "400;500;700". */
  weights: string;
  /** Google Fonts family slug (for building a stylesheet URL). */
  slug: string;
}

export const FONT_PRESETS: Record<string, FontPreset> = {
  default: {
    heading: "Inter",
    body: "Inter",
    weights: "400;500;600;700",
    slug: "Inter:wght@400;500;600;700",
  },
  editorial: {
    heading: "Playfair Display",
    body: "Source Sans 3",
    weights: "400;600;700",
    slug: "Playfair+Display:wght@700&family=Source+Sans+3:wght@400;600",
  },
  geometric: {
    heading: "Montserrat",
    body: "Source Sans 3",
    weights: "400;600;700",
    slug: "Montserrat:wght@600;700&family=Source+Sans+3:wght@400;600",
  },
  humanist: {
    heading: "Lora",
    body: "Inter",
    weights: "400;500;600;700",
    slug: "Lora:wght@600;700&family=Inter:wght@400;500",
  },
  bold: {
    heading: "Space Grotesk",
    body: "Inter",
    weights: "400;500;700",
    slug: "Space+Grotesk:wght@500;700&family=Inter:wght@400;500",
  },
  elegant: {
    heading: "DM Serif Display",
    body: "DM Sans",
    weights: "400;500;700",
    slug: "DM+Serif+Display&family=DM+Sans:wght@400;500",
  },
  clean: {
    heading: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    weights: "400;500;600;700",
    slug: "Plus+Jakarta+Sans:wght@400;500;600;700",
  },
  techno: {
    heading: "JetBrains Mono",
    body: "Inter",
    weights: "400;500;700",
    slug: "JetBrains+Mono:wght@500;700&family=Inter:wght@400;500",
  },
};

// ---------------------------------------------------------------------------
// Slides & elements — percentage-based positioned elements
// ---------------------------------------------------------------------------

export interface Slide {
  id: string;
  /** Per-slide background override (color token or hex). Falls back to theme slideBg. */
  background?: string;
  elements: SlideElement[];
}

export interface SlideDeck {
  version: 2;
  theme: SlideTheme;
  slides: Slide[];
}

/** All coordinates are percentages (0–100) of the 960×540 canvas. */
interface BaseElement {
  id: string;
  /** Left edge, 0–100 */
  x: number;
  /** Top edge, 0–100 */
  y: number;
  /** Width, 0–100 */
  w: number;
  /** Height, 0–100 */
  h: number;
  rotation?: number;
}

export interface TextElement extends BaseElement {
  kind: "text";
  text: string;
  /** Percentage of canvas width (e.g. 4.5 ≈ 43px at 960w) */
  fontSize: number;
  fontRole: "heading" | "body";
  fontWeight: number;
  color: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  fontStyle?: "italic" | "normal";
  textTransform?: "uppercase" | "none";
  /** Override the theme font for this element (e.g. "Playfair Display") */
  fontFamily?: string;
}

export interface ImageElement extends BaseElement {
  kind: "image";
  src: string;
  cornerRadius?: number;
}

export interface ShapeElement extends BaseElement {
  kind: "shape";
  shape: "rect" | "circle" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface IconElement extends BaseElement {
  kind: "icon";
  name: string;
  color: string;
  /** Percentage of canvas width */
  fontSize: number;
}

export type SlideElement = TextElement | ImageElement | ShapeElement | IconElement;

// ---------------------------------------------------------------------------
// Percentage ↔ pixel conversion helpers
// ---------------------------------------------------------------------------

/** Convert percentage x to pixel x. */
export function pctToX(pct: number): number {
  return (pct / 100) * REF_W;
}

/** Convert percentage y to pixel y. */
export function pctToY(pct: number): number {
  return (pct / 100) * REF_H;
}

/** Convert percentage width to pixel width. */
export function pctToW(pct: number): number {
  return (pct / 100) * REF_W;
}

/** Convert percentage height to pixel height. */
export function pctToH(pct: number): number {
  return (pct / 100) * REF_H;
}

/** Convert percentage fontSize to pixel fontSize (relative to canvas width). */
export function pctToFontSize(pct: number): number {
  return (pct / 100) * REF_W;
}

/** Convert pixel x to percentage. */
export function xToPct(px: number): number {
  return (px / REF_W) * 100;
}

/** Convert pixel y to percentage. */
export function yToPct(px: number): number {
  return (px / REF_H) * 100;
}

/** Convert pixel width to percentage. */
export function wToPct(px: number): number {
  return (px / REF_W) * 100;
}

/** Convert pixel height to percentage. */
export function hToPct(px: number): number {
  return (px / REF_H) * 100;
}

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

export const READ_SLIDES_SCHEMA = {
  name: "read_slides",
  description:
    "Returns the current slide deck JSON from slides.json. Use this before patch_slides to see what needs changing.",
  arguments: {
    type: "object",
    properties: {},
  },
} as const;

export const PATCH_SLIDES_SCHEMA = {
  name: "patch_slides",
  description: `Apply targeted operations to an existing slide deck. The deck re-renders inline automatically after each patch; pass replaces_interaction_id from a previous create_slides/patch_slides result to update the same deck viewer in-place (otherwise a new viewer is created).

Operations:
- update_element: modify properties of an element within a slide
- add_element: add a new element to a slide
- remove_element: remove an element from a slide
- update_slide: modify slide-level properties (e.g. background color)
- add_slide: add a new slide (with elements)
- delete_slide: remove a slide
- update_theme: update the deck theme colors or font preset`,
  arguments: {
    type: "object",
    properties: {
      replaces_interaction_id: {
        type: "string",
        description:
          "interaction_id from a previous create_slides or patch_slides result. Pass this to update the existing deck viewer in-place instead of creating a new one.",
      },
      operations: {
        type: "array",
        description: "Array of operations to apply in order",
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: [
                "update_element",
                "add_element",
                "remove_element",
                "update_slide",
                "add_slide",
                "delete_slide",
                "update_theme",
              ],
              description: "The operation to perform",
            },
            slideId: {
              type: "string",
              description: "Target slide id",
            },
            elementId: {
              type: "string",
              description: "Target element id (for update_element and remove_element)",
            },
            set: {
              type: "object",
              properties: {},
              additionalProperties: true,
              description:
                "Partial element fields to merge (for update_element) or theme fields (for update_theme)",
            },
            element: {
              type: "object",
              properties: {},
              additionalProperties: true,
              description: "Full element object to add (for add_element)",
            },
            slide: {
              type: "object",
              properties: {},
              additionalProperties: true,
              description: "Full slide object with elements (for add_slide)",
            },
            afterSlideId: {
              type: "string",
              description: "Insert new slide after this id. Omit to append at the end.",
            },
          },
          required: ["action"],
        },
      },
    },
    required: ["operations"],
  },
} as const;

export const PLAN_SLIDES_SCHEMA = {
  name: "plan_slides",
  description: `Plan a new slide deck before you generate it. Call this FIRST — once — when creating a new deck. You pick:
  - fontPreset: one of the font-preset keys
  - paletteName: the register name from the palette table (e.g. "warm editorial", "techno dark")
  - slides: an array of { id, layout, topic } — layout must be an exact name from the LAYOUT CATALOG

The result contains the element recipes for every layout you picked, plus the shared header pattern, element-type schemas, coordinate-system notes, and the full palette hex values. You then call create_slides once with the concrete deck JSON, using those recipes as blueprints.

For editing an existing deck (read_slides + patch_slides flow), do NOT call plan_slides.`,
  arguments: {
    type: "object",
    properties: {
      fontPreset: {
        type: "string",
        description:
          "Font preset key (default, editorial, geometric, humanist, bold, elegant, clean, techno)",
      },
      paletteName: {
        type: "string",
        description:
          "Palette register name from the CHOOSING A PALETTE table. Copy exactly (e.g. 'warm editorial').",
      },
      slides: {
        type: "array",
        description: "One entry per slide, in order.",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Short snake-case slide id (e.g. 'cover', 'soil_intro')",
            },
            layout: {
              type: "string",
              description:
                "Short layout name from the LAYOUT CATALOG (kebab-case, e.g. 'cover-bottom', 'compare-two-panel', 'takeaways-numbered').",
            },
            topic: {
              type: "string",
              description: "One-line summary of what this slide will cover",
            },
          },
          required: ["id", "layout", "topic"],
        },
      },
    },
    required: ["fontPreset", "paletteName", "slides"],
  },
} as const;

export const CREATE_SLIDES_SCHEMA = {
  name: "create_slides",
  description: `Create a new slide deck from a complete SlideDeck JSON object. Call this AFTER plan_slides — the plan_slides result contains the layout recipes you should follow. The deck renders inline automatically; the result includes an interaction_id you can pass to later patch_slides calls (as replaces_interaction_id) to update the same deck viewer in-place.

Deck shape: { version: 2, theme: { fontPreset, colors: { background, slideBg, surfaceSecondary, textPrimary, textSecondary, textMuted, accent, card, border } }, slides: Slide[] }
Slide shape: { id, background?, elements: SlideElement[] }

Use the element recipes from the plan_slides result as geometry blueprints and substitute your own real text.`,
  arguments: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the presentation (shown above the deck in the UI).",
      },
      deck: {
        type: "object",
        description: "Full SlideDeck JSON",
        properties: {
          version: { type: "number", description: "Always 2" },
          theme: {
            type: "object",
            properties: {},
            additionalProperties: true,
            description: "SlideTheme with fontPreset + colors",
          },
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {},
              additionalProperties: true,
            },
            description: "Array of Slide objects",
          },
        },
        required: ["version", "theme", "slides"],
      },
    },
    required: ["title", "deck"],
  },
} as const;

// ---------------------------------------------------------------------------
// extractSlideContent — compact summary for LLM tool results
// ---------------------------------------------------------------------------

/**
 * Extract a compact text summary of a slide deck JSON string, intended for
 * inclusion in `read_slides` tool results. Keeps element positions, kinds,
 * and truncated text so the LLM can plan edits without the full JSON.
 */
export function extractSlideContent(json: string): string {
  try {
    const deck = JSON.parse(json) as {
      slides: Array<{
        id: string;
        background?: string;
        elements: Array<{
          id: string;
          kind: string;
          x: number;
          y: number;
          w: number;
          h: number;
          text?: string;
          name?: string;
          shape?: string;
          src?: string;
          fill?: string;
        }>;
      }>;
    };
    return deck.slides
      .map((s, i) => {
        const summary = s.elements
          .map((el) => {
            if (el.kind === "text")
              return `  [${el.id}] text "${(el.text ?? "").slice(0, 40)}" at (${el.x},${el.y}) ${el.w}x${el.h}`;
            if (el.kind === "shape")
              return `  [${el.id}] ${el.shape} at (${el.x},${el.y}) ${el.w}x${el.h}`;
            if (el.kind === "icon") return `  [${el.id}] icon "${el.name}" at (${el.x},${el.y})`;
            if (el.kind === "image")
              return `  [${el.id}] image at (${el.x},${el.y}) ${el.w}x${el.h}`;
            return `  [${el.id}] ${el.kind}`;
          })
          .join("\n");
        const bg = s.background ? ` (bg: ${s.background})` : "";
        return `Slide ${i + 1} [${s.id}]${bg}:\n${summary}`;
      })
      .join("\n\n");
  } catch {
    return json;
  }
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export interface CreateSlideToolsOptions {
  /** Returns the current conversation ID (may be null before first message). */
  getConversationId: () => string | null;
  /** Storage backend for slides.json — only getFile/putFile are required. */
  storage: Pick<AppFileStorage, "getFile" | "putFile">;
  /** Optional error logger. Defaults to a no-op. */
  logError?: (message: string, error?: Error) => void;
  /**
   * Host-supplied hook that emits a deck-display UI interaction. Called
   * automatically from inside `create_slides` and `patch_slides`; its
   * return value is merged into the tool result so the model (and the
   * chat UI) see the `interaction_id`. Receives `{ title, replaces_interaction_id }`.
   *
   * Omit in headless/test environments that don't need a UI anchor — in
   * that case the tool results just omit `interaction_id`.
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- intentional: allows synchronous return values
  displaySlides?: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

/** Shallow-merge only own, non-prototype keys to prevent prototype pollution. */
function safeMerge(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const key of Object.keys(patch)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    target[key] = patch[key];
  }
}

/**
 * Create the slide deck tool suite: `plan_slides`, `create_slides`,
 * `read_slides`, and `patch_slides`.
 *
 * New decks flow: plan_slides → create_slides.
 * Existing deck edits: read_slides → patch_slides.
 *
 * When `displaySlides` is provided, `create_slides` and `patch_slides`
 * automatically emit the deck-display UI interaction as part of their
 * result. No standalone `display_slides` tool — the write and the
 * display anchor are a single step.
 *
 * Backed by the provided storage adapter. No dependency on the
 * app-generation `create_file` tool — `create_slides` writes slides.json
 * directly.
 */
export function createSlideTools({
  getConversationId,
  storage,
  logError = () => {},
  displaySlides,
}: CreateSlideToolsOptions): ToolConfig[] {
  function requireConversationId(): string {
    const id = getConversationId();
    if (!id) throw new Error("No active conversation");
    return id;
  }

  const planSlidesTool: ToolConfig = {
    type: "function",
    function: PLAN_SLIDES_SCHEMA,
    executor: (args: Record<string, unknown>) => {
      try {
        const fontPreset = typeof args.fontPreset === "string" ? args.fontPreset : "";
        const paletteName = typeof args.paletteName === "string" ? args.paletteName : "";
        const slides = Array.isArray(args.slides)
          ? (args.slides as Array<{ id?: unknown; layout?: unknown; topic?: unknown }>)
          : [];

        if (!fontPreset || !FONT_PRESETS[fontPreset]) {
          return {
            error: `Unknown fontPreset '${fontPreset}'. Valid: ${Object.keys(FONT_PRESETS).join(", ")}`,
          };
        }

        const palette = getPaletteByName(paletteName);
        if (!palette) {
          return {
            error: `Unknown paletteName '${paletteName}'. Use an exact name from the CHOOSING A PALETTE table.`,
          };
        }

        if (slides.length === 0) {
          return { error: "slides array is required and must not be empty" };
        }

        const unknownLayouts: string[] = [];
        const chosenLayouts: string[] = [];
        for (const s of slides) {
          const layout = typeof s.layout === "string" ? s.layout : "";
          if (!layout) {
            unknownLayouts.push("(missing)");
            continue;
          }
          if (!getLayoutByName(layout)) {
            unknownLayouts.push(layout);
            continue;
          }
          chosenLayouts.push(layout);
        }
        if (unknownLayouts.length > 0) {
          return {
            error: `Unknown layout name(s): ${unknownLayouts.join(" | ")}. Use the short kebab-case name from LAYOUT CATALOG (e.g. 'cover-bottom').`,
          };
        }

        const recipes = renderLayoutRecipes(chosenLayouts);
        const planSummary = slides
          .map((s, i) => `${i + 1}. ${String(s.id)} — ${String(s.layout)}`)
          .join("\n");

        const content = `Plan accepted.

Theme: ${palette.name} (fontPreset: ${palette.fontPreset})
Palette colors (copy verbatim into theme.colors):
${renderPaletteColors(palette)}

Slide plan (${slides.length}):
${planSummary}

COORDINATE SYSTEM — positions are percentages (0–100) of a 16:9 canvas (960×540 reference).
- x=0 left, x=100 right, y=0 top, y=100 bottom
- Standard padding: x≈6, y≈9. Content area: x=6–94, y=9–91
- fontSize is percentage of canvas width: 4.5 ≈ 43px heading, 1.9 ≈ 18px body

ELEMENT TYPES:
${renderElementKinds()}

SHARED HEADER PATTERN — place on every content slide (skip on cover and chapter-break):
${renderSharedHeader()}

LAYOUT RECIPES (only the ones you picked — copy geometries, substitute your text):

${recipes}

NOW call create_slides ONCE with { title, deck }. Pick a short presentation title (shown in the UI header). Set deck.version to 2, deck.theme.fontPreset to "${palette.fontPreset}", copy the palette colors above verbatim into deck.theme.colors, and build one deck.slides entry per plan entry using the recipes as blueprints. The deck renders inline automatically; the result includes an interaction_id you can pass to patch_slides.replaces_interaction_id for later in-place updates.`;

        return { content };
      } catch (err) {
        logError("plan_slides failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to plan slides: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const createSlidesTool: ToolConfig = {
    type: "function",
    function: CREATE_SLIDES_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const title = typeof args.title === "string" ? args.title : "";
        const deck = args.deck as SlideDeck | undefined;
        if (!title) {
          return { error: "title is required" };
        }
        if (!deck || typeof deck !== "object") {
          return { error: "deck is required and must be a SlideDeck object" };
        }
        if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
          return { error: "deck.slides must be a non-empty array" };
        }
        if (!deck.theme || typeof deck.theme !== "object") {
          return { error: "deck.theme is required" };
        }
        const normalized: SlideDeck = {
          version: 2,
          theme: deck.theme,
          slides: deck.slides,
        };
        await storage.putFile(conversationId, "slides.json", JSON.stringify(normalized));
        const display = displaySlides ? await displaySlides({ title }) : null;
        return {
          success: true,
          slides: normalized.slides.length,
          message: `Wrote slides.json with ${normalized.slides.length} slides.`,
          ...(display && typeof display === "object" ? display : {}),
        };
      } catch (err) {
        logError("create_slides failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to create slides: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const readSlidesTool: ToolConfig = {
    type: "function",
    function: READ_SLIDES_SCHEMA,
    executor: async () => {
      try {
        const conversationId = requireConversationId();
        const file = await storage.getFile(conversationId, "slides.json");
        if (!file) return { error: "No slides.json found." };
        return { content: extractSlideContent(file.content) };
      } catch (err) {
        logError("read_slides failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to read slides: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const patchSlidesTool: ToolConfig = {
    type: "function",
    function: PATCH_SLIDES_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const operations = args.operations as Array<{
          action: string;
          slideId?: string;
          elementId?: string;
          set?: Record<string, unknown>;
          element?: SlideElement;
          slide?: Slide;
          afterSlideId?: string;
        }>;

        if (!Array.isArray(operations) || operations.length === 0) {
          return { error: "operations array is required and must not be empty" };
        }

        const file = await storage.getFile(conversationId, "slides.json");
        if (!file) return { error: "No slides.json found. Call create_slides first." };

        const deck = JSON.parse(file.content) as SlideDeck;
        const results: string[] = [];

        for (const op of operations) {
          const slide = op.slideId ? deck.slides.find((s) => s.id === op.slideId) : undefined;

          switch (op.action) {
            case "update_element": {
              if (!slide) {
                results.push(`update_element: slide ${op.slideId} not found`);
                break;
              }
              const el = slide.elements.find((e) => e.id === op.elementId);
              if (!el) {
                results.push(`update_element: element ${op.elementId} not found`);
                break;
              }
              if (op.set) safeMerge(el as unknown as Record<string, unknown>, op.set);
              results.push(`updated ${op.slideId}/${op.elementId}`);
              break;
            }
            case "add_element": {
              if (!slide) {
                results.push(`add_element: slide ${op.slideId} not found`);
                break;
              }
              if (!op.element) {
                results.push("add_element: missing element");
                break;
              }
              slide.elements.push(op.element);
              results.push(`added ${op.element.id} to ${op.slideId}`);
              break;
            }
            case "remove_element": {
              if (!slide) {
                results.push(`remove_element: slide ${op.slideId} not found`);
                break;
              }
              const before = slide.elements.length;
              slide.elements = slide.elements.filter((e) => e.id !== op.elementId);
              results.push(
                slide.elements.length < before
                  ? `removed ${op.elementId}`
                  : `remove_element: ${op.elementId} not found`
              );
              break;
            }
            case "update_slide": {
              if (!slide) {
                results.push(`update_slide: slide ${op.slideId} not found`);
                break;
              }
              if (op.set) safeMerge(slide as unknown as Record<string, unknown>, op.set);
              results.push(`updated slide ${op.slideId}`);
              break;
            }
            case "add_slide": {
              if (!op.slide) {
                results.push("add_slide: missing slide");
                break;
              }
              const insertIdx = op.afterSlideId
                ? deck.slides.findIndex((s) => s.id === op.afterSlideId)
                : -1;
              if (insertIdx === -1) deck.slides.push(op.slide);
              else deck.slides.splice(insertIdx + 1, 0, op.slide);
              results.push(`added slide ${op.slide.id}`);
              break;
            }
            case "delete_slide": {
              if (!op.slideId) {
                results.push("delete_slide: missing slideId");
                break;
              }
              const len = deck.slides.length;
              deck.slides = deck.slides.filter((s) => s.id !== op.slideId);
              results.push(
                deck.slides.length < len
                  ? `deleted ${op.slideId}`
                  : `delete_slide: ${op.slideId} not found`
              );
              break;
            }
            case "update_theme": {
              if (op.set) safeMerge(deck.theme as unknown as Record<string, unknown>, op.set);
              results.push("updated theme");
              break;
            }
            default:
              results.push(`unknown action: ${op.action}`);
          }
        }

        await storage.putFile(conversationId, "slides.json", JSON.stringify(deck));
        const replacesId =
          typeof args.replaces_interaction_id === "string"
            ? args.replaces_interaction_id
            : undefined;
        const display = displaySlides
          ? await displaySlides(replacesId ? { replaces_interaction_id: replacesId } : {})
          : null;
        return {
          success: true,
          results,
          ...(display && typeof display === "object" ? display : {}),
        };
      } catch (err) {
        logError("patch_slides failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to patch slides: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  return [planSlidesTool, createSlidesTool, readSlidesTool, patchSlidesTool];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * Build the slide mode system prompt — slim planning-step version.
 *
 * Instructs the LLM to use the two-step flow: plan_slides first (picks
 * palette + fontPreset + layout-per-slide), then create_slides with the
 * full deck. Layout element recipes, element-type schemas, shared-header
 * pattern, coordinate-system detail, and palette hex values are NOT in
 * this prompt — they come back in the plan_slides tool result so the
 * generation turn only sees the handful of layouts actually picked.
 */
export function buildSlideSystemPrompt(): string {
  const fontTable = Object.entries(FONT_PRESETS)
    .map(([name, p]) => `  ${name}: heading="${p.heading}", body="${p.body}"`)
    .join("\n");

  return `You are a presentation design assistant. You produce polished slide decks as JSON with positioned elements.

WORKFLOW (two steps for a new deck):
1. PLAN — call plan_slides ONCE with { fontPreset, paletteName, slides: [{ id, layout, topic }] }. Pick a layout from the LAYOUT CATALOG for each slide; pick a palette from CHOOSING A PALETTE.
2. GENERATE — the plan_slides result contains the element recipes for every layout you picked, the shared header pattern, element-type schemas, coordinate-system notes, and the palette hex values. Call create_slides ONCE with { title, deck }, using those recipes as blueprints and substituting real text. The deck renders inline automatically and the result includes an interaction_id.

For edits to an existing deck: read_slides → patch_slides. Pass the interaction_id from the most recent create_slides or patch_slides result as replaces_interaction_id so the patch updates the same deck viewer in-place. No plan_slides needed for edits.

Never output code as text. Always use tools. Keep text responses to one or two sentences.

LAYOUT CATALOG — each entry is "short-name — description". Pass the short name (e.g. "compare-two-panel") as the layout field in plan_slides:

${renderLayoutCatalog()}

LAYOUT PICKER — match content shape to a template, don't default to grids:
- Sequence through time (seasons, phases, steps, months) → timeline-horizontal, timeline-numbered, or timeline-table.
- Rows with the same schema (plant × zone × note; year × event × note) → table or timeline-table.
- Single memorable number or statement → focus-metric or stats-large.
- Mega-number paired with what-it-unlocks → focus-number-list.
- Two-panel contrast (classical vs quantum, before vs after) → compare-two-panel.
- 3-part outline / steps 01/02/03 / feature rundown → agenda-cards.
- Closing summary with "take three things with you" → takeaways-numbered.
- Running prose explanation → text-prose or text-two-col.
- Short list ≤ 6 items with short descriptions → text-bullets — reach for this before cells.
- Memorable quote / proverb → quote-offset or quote-centered.
- 3–6 categorical cards with no natural order → stats-cells or list-hairline — last resort, not the default.
- Image-forward visual → hero-split or hero-overlay.

LAYOUT VARIETY IS MANDATORY. Do not reuse the same content-slide layout more than twice in a deck. If you have 4 content slides pick 4 different layouts.

FONT PRESETS:
${fontTable}
Tech → bold/techno. Business → geometric/clean. Culture → editorial/humanist. Premium → elegant.

CHOOSING A PALETTE — don't default to dark grey + orange. Pick the register that matches the topic; plan_slides will inject its hex values for you. Don't invent new palettes unless the topic really demands it.

${renderPaletteNames()}

IMAGES:
- Do NOT use web search or arbitrary URLs. Only "attached:N" strings (user-attached images) or URLs from AnumaImageMCP-generate_cloud_image (generate 1–2 max first).
- Most decks should be text-only. If no images are available, omit image elements entirely.
- With images: generate them FIRST, then call plan_slides and create_slides — the deck renders the moment create_slides succeeds.

ICONS: Material Symbols Rounded — bolt, lock, search, favorite, star, check_circle, trending_up, rocket_launch, groups, code, brush, settings, etc.

COLOR TOKENS: textPrimary, textSecondary, textMuted, accent, card, border, background, slideBg`;
}
