/**
 * Slide deck tools for LLM-driven presentation generation.
 *
 * Provides read_slides, patch_slides, and (optionally) display_slides tool
 * configurations, along with the type system, coordinate helpers, font
 * presets, and system prompt that drive the slide generation flow.
 *
 * Slide decks are JSON documents persisted to a file named `slides.json`
 * via the shared `AppFileStorage` interface. The LLM writes the initial
 * deck with `create_file` (from `appGeneration`) and applies incremental
 * edits with `patch_slides`. All positions use a percentage-based
 * coordinate system relative to a 960×540 (16:9) reference canvas.
 *
 * @example
 * ```typescript
 * import {
 *   createAppGenerationTools,
 *   createSlideTools,
 *   buildSlideSystemPrompt,
 * } from "@anuma/sdk/tools";
 *
 * const fileTools = createAppGenerationTools({ getConversationId, storage });
 * const slideTools = createSlideTools({
 *   getConversationId,
 *   storage,
 *   displaySlides: async (args) => ({ ...args, displayType: "slides" }),
 * });
 *
 * await sendMessage({
 *   messages: [...],
 *   tools: [...fileTools, ...slideTools],
 *   systemPrompt: buildSlideSystemPrompt(),
 * });
 * ```
 *
 * @module tools/slides
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { AppFileStorage } from "./appGeneration";

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
  description: `Applies targeted operations to the slide deck. Use this instead of create_file for incremental changes.

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

export const DISPLAY_SLIDES_SCHEMA = {
  name: "display_slides",
  description:
    "Renders the slide deck preview from slides.json. Call this after writing slides.json with create_file or after patching with patch_slides. Pass replaces_interaction_id from a previous result to update in-place.",
  arguments: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the presentation (shown above the slide deck)",
      },
      replaces_interaction_id: {
        type: "string",
        description:
          "The interaction_id from a previous display_slides result. Updates deck in-place.",
      },
    },
    required: ["title"],
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
   * Optional executor for display_slides. When provided, a display_slides
   * tool is included in the returned array. Typically wired to a UI-level
   * interaction that renders the deck inline.
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
 * Create the slide deck tool suite (`read_slides`, `patch_slides`, and
 * optionally `display_slides`) backed by the provided storage adapter.
 *
 * The tools expect a sibling file-creation tool (from
 * {@link createAppGenerationTools}) to produce the initial `slides.json`.
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
        if (!file) return { error: "No slides.json found. Use create_file first." };

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
        return { success: true, results };
      } catch (err) {
        logError("patch_slides failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to patch slides: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const tools: ToolConfig[] = [readSlidesTool, patchSlidesTool];

  if (displaySlides) {
    tools.push({
      type: "function",
      function: DISPLAY_SLIDES_SCHEMA,
      executor: displaySlides,
      dependsOn: ["create_file", "patch_file", "patch_slides"],
    });
  }

  return tools;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * Build the slide mode system prompt.
 *
 * Instructs the LLM to generate a JSON slide deck with percentage-based
 * positioned elements using `create_file` + `patch_slides`. The deck is
 * rendered by the host app as soon as `slides.json` is written.
 */
export function buildSlideSystemPrompt(): string {
  const fontTable = Object.entries(FONT_PRESETS)
    .map(([name, p]) => `  ${name}: heading="${p.heading}", body="${p.body}"`)
    .join("\n");

  return `You are a presentation design assistant. You produce polished slide decks as JSON files with positioned elements.

WORKFLOW:
1. NEVER output code as text or markdown. ALWAYS use tools.
2. To create a new deck: use create_file to write "slides.json" with a valid SlideDeck JSON object. The deck appears automatically as soon as create_file succeeds — there is no separate render tool to call.
3. For ALL changes to an existing deck:
   - First call read_slides to see the current elements and their positions.
   - Then use patch_slides with targeted operations (update_element, add_element, remove_element, update_slide, add_slide, delete_slide, update_theme). The deck re-renders automatically — no separate render tool to call.
4. Only use create_file to fully rewrite slides.json when the majority of the content is changing.
5. Keep text responses to one or two sentences.

COORDINATE SYSTEM — all positions use percentages (0–100):
- Canvas is 16:9 (960×540 reference). x=0 is left edge, x=100 is right edge. y=0 is top, y=100 is bottom.
- Standard padding: x≈6, y≈9
- Content area: x=6 to x=94, y=9 to y=91
- Center of slide: x=50, y=50
- Full-width element: x=0, w=100 (edge-to-edge) or x=6, w=88 (with padding)
- fontSize is percentage of canvas width: 4.5 ≈ 43px heading, 1.9 ≈ 18px body, 2.5 ≈ 24px sub

ELEMENT TYPES:
text: { kind: "text", id, x, y, w, h, text, fontSize, fontRole: "heading"|"body", fontWeight, color, align?, lineHeight?, fontStyle?, textTransform?, fontFamily? }
  fontFamily is optional — overrides the theme preset for this element (e.g. "Playfair Display", "JetBrains Mono"). Omit to use the theme default.
shape: { kind: "shape", id, x, y, w, h, shape: "rect"|"circle"|"line", fill?, stroke?, strokeWidth?, cornerRadius? }
image: { kind: "image", id, x, y, w, h, src, cornerRadius? }
icon: { kind: "icon", id, x, y, w, h, name, color, fontSize }

SLIDE STRUCTURE:
Each slide: { id, elements, background? }
- background: optional color token or hex. Defaults to theme slideBg.
- To change background: patch_slides with { action: "update_slide", slideId, set: { background: "#hex" } }

COLOR TOKENS: textPrimary, textSecondary, textMuted, accent, card, border, background, slideBg
ICONS: Material Symbols Rounded — bolt, lock, search, favorite, star, check_circle, trending_up, rocket_launch, groups, code, brush, settings, etc.

FONT PRESETS:
${fontTable}
Recommendations: Tech → bold/techno. Business → geometric/clean. Culture → editorial/humanist. Premium → elegant.

SHARED HEADER PATTERN — use on every content slide, not as a standalone template:
  eyebrow: { kind: "text", x: 6, y: 9, w: 80, h: 3.5, text: "CHAPTER 01 · SOIL", fontSize: 1.4, fontRole: "body", fontWeight: 500, color: "textMuted", fontFamily: "JetBrains Mono", letterSpacing: 0.16, textTransform: "uppercase" }
  title: { kind: "text", x: 6, y: 14, w: 88, h: 10, text: "Reading your soil", fontSize: 5.2, fontRole: "heading", fontWeight: 400, color: "textPrimary", align: "left", lineHeight: 1.0 }
  rule: { kind: "shape", shape: "line", x: 6, y: 26, w: 88, h: 0, stroke: "border", strokeWidth: 1 }
  Content below the header starts at y ≥ 30. Skip this pattern on cover and chapter-break slides only.

LAYOUT TEMPLATES — use these as blueprints when building slides. Vary your layouts across a deck.

COVER (centered):
  title: { kind: "text", x: 7.5, y: 30, w: 85, h: 20, fontSize: 4.5, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "center" }
  subtitle: { kind: "text", x: 19, y: 55, w: 62, h: 8, fontSize: 2.3, fontRole: "heading", fontWeight: 500, color: "textSecondary", align: "center" }

COVER (left, with accent bar):
  bar: { kind: "shape", shape: "rect", x: 6, y: 26, w: 5, h: 0.6, fill: "accent", cornerRadius: 0.2 }
  title: { kind: "text", x: 6, y: 30, w: 88, h: 24, fontSize: 4.5, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "left" }
  subtitle: { kind: "text", x: 6, y: 56, w: 88, h: 9, fontSize: 2.3, fontRole: "heading", fontWeight: 500, color: "textSecondary", align: "left" }

COVER (bottom — huge title at bottom, metadata top):
  meta: { kind: "text", x: 6, y: 7, w: 30, h: 4, fontSize: 1.4, fontRole: "heading", fontWeight: 500, color: "textMuted", align: "left", textTransform: "uppercase" }
  title: { kind: "text", x: 6, y: 68, w: 88, h: 26, fontSize: 6.5, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "left" }

SECTION (dark chapter break — rhythm marker between parts of a multi-part deck):
  Set slide.background to a dark hex (e.g. "#1F2A22", "#1a1b1e") so this slide reads as a tonal shift from content slides.
  eyebrow: { kind: "text", x: 6, y: 55, w: 40, h: 3.5, text: "CHAPTER TWO", fontSize: 1.4, fontRole: "body", fontWeight: 500, color: "accent", fontFamily: "JetBrains Mono", letterSpacing: 0.16, textTransform: "uppercase" }
  title: { kind: "text", x: 6, y: 61, w: 88, h: 26, text: "Timing is\\nhalf the game.", fontSize: 7.5, fontRole: "heading", fontWeight: 400, color: "#EDE6D8", fontStyle: "italic", align: "left", lineHeight: 1.02 }
  subtitle: { kind: "text", x: 6, y: 89, w: 82, h: 7, fontSize: 1.8, fontRole: "body", fontWeight: 400, color: "#B8BEB3", align: "left", lineHeight: 1.3 }

TEXT (prose):
  heading: { kind: "text", x: 6, y: 10, w: 88, h: 10, fontSize: 3, fontRole: "heading", fontWeight: 600, color: "textPrimary", align: "left" }
  body: { kind: "text", x: 6, y: 23, w: 66, h: 65, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", align: "left", lineHeight: 1.8 }

TEXT (bullets):
  heading: { kind: "text", x: 6, y: 9, w: 88, h: 10, fontSize: 3, fontRole: "heading", fontWeight: 600, color: "accent", align: "left" }
  bullets: { kind: "text", x: 6, y: 22, w: 88, h: 68, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", align: "left", lineHeight: 1.75 }
  (Use "• " prefix for each bullet line)

TEXT (two-column — heading left, content right):
  heading: { kind: "text", x: 6, y: 9, w: 33, h: 82, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent", align: "left", textTransform: "uppercase" }
  body: { kind: "text", x: 43, y: 9, w: 51, h: 82, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", align: "left", lineHeight: 1.7 }

STATS (hairline cells — editorial grid, no filled cards):
  Header: use SHARED HEADER PATTERN above (y 9–26).
  topRule: { kind: "shape", shape: "line", x: 6, y: 30, w: 88, h: 0, stroke: "border", strokeWidth: 1 }
  For each cell (i=0,1,2):
    eyebrow: { kind: "text", x: 7+30*i, y: 34, w: 27, h: 3.5, text: "01 · Revenue", fontSize: 1.3, fontRole: "body", fontWeight: 500, color: "textMuted", fontFamily: "JetBrains Mono", letterSpacing: 0.14, textTransform: "uppercase" }
    value: { kind: "text", x: 7+30*i, y: 41, w: 27, h: 12, text: "142%", fontSize: 5.5, fontRole: "heading", fontWeight: 400, color: "accent", align: "left", lineHeight: 1.0 }
    body: { kind: "text", x: 7+30*i, y: 57, w: 27, h: 20, text: "Year-over-year growth, Q4.", fontSize: 1.5, fontRole: "body", fontWeight: 400, color: "textSecondary", lineHeight: 1.4 }
  Vertical dividers between cells (use narrow rects, not line shapes): for i=1,2 add
    { kind: "shape", shape: "rect", x: 6+30*i, y: 31, w: 0.1, h: 48, fill: "border" }
  bottomRule: { kind: "shape", shape: "line", x: 6, y: 80, w: 88, h: 0, stroke: "border", strokeWidth: 1 }

STATS (inline — border-left accent):
  For each stat: vertical accent bar (rect w=0.3, h=11, fill="accent") + value + label stacked

STATS (large — featured number):
  value: { kind: "text", x: 7.5, y: 28, w: 85, h: 22, fontSize: 7.5, fontRole: "heading", fontWeight: 700, color: "accent", align: "center" }
  label: { kind: "text", x: 15, y: 52, w: 70, h: 8, fontSize: 2.1, fontRole: "heading", fontWeight: 400, color: "textMuted", align: "center" }
  body: { kind: "text", x: 15, y: 63, w: 70, h: 12, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textMuted", align: "center", lineHeight: 1.5 }

LIST (hairline entries — editorial field guide, 3 cols × 2 rows):
  Header: use SHARED HEADER PATTERN above.
  topRule: { kind: "shape", shape: "line", x: 6, y: 30, w: 88, h: 0, stroke: "border", strokeWidth: 1 }
  For each entry at grid position (row r ∈ 0..1, col c ∈ 0..2):
    eyebrow: { kind: "text", x: 7+30*c, y: 33+r*24, w: 27, h: 3.5, text: "SUCKING · SOFT-BODIED", fontSize: 1.3, fontRole: "body", fontWeight: 500, color: "textMuted", fontFamily: "JetBrains Mono", letterSpacing: 0.14, textTransform: "uppercase" }
    title: { kind: "text", x: 7+30*c, y: 37+r*24, w: 27, h: 7, text: "Aphids", fontSize: 3.8, fontRole: "heading", fontWeight: 400, color: "textPrimary", align: "left", lineHeight: 1.0 }
    body: { kind: "text", x: 7+30*c, y: 46+r*24, w: 27, h: 9, text: "Clusters on new growth. Sticky residue.", fontSize: 1.5, fontRole: "body", fontWeight: 400, color: "textSecondary", lineHeight: 1.35 }
  Vertical dividers between columns (c=1,2): { kind: "shape", shape: "rect", x: 6+30*c, y: 31, w: 0.1, h: 48, fill: "border" }
  Horizontal divider between rows: { kind: "shape", shape: "line", x: 6, y: 56, w: 88, h: 0, stroke: "border", strokeWidth: 1 }
  bottomRule: { kind: "shape", shape: "line", x: 6, y: 80, w: 88, h: 0, stroke: "border", strokeWidth: 1 }

LIST (minimal — sidebar heading, stacked items with dividers):
  heading: { kind: "text", x: 6, y: 9, w: 29, h: 82, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent", textTransform: "uppercase" }
  Items in right column with line dividers (shape "line" with stroke="border")

QUOTE (large, centered):
  quote: { kind: "text", x: 7.5, y: 26, w: 85, h: 37, fontSize: 3.3, fontRole: "heading", fontWeight: 400, color: "textPrimary", align: "center", fontStyle: "italic", lineHeight: 1.4 }
  attribution: { kind: "text", x: 20, y: 69, w: 60, h: 5, fontSize: 1.5, fontRole: "body", fontWeight: 500, color: "textMuted", align: "center", textTransform: "uppercase" }

QUOTE (offset — left-aligned with accent bar):
  bar: { kind: "shape", shape: "rect", x: 7.5, y: 28, w: 0.3, h: 33, fill: "accent" }
  quote: { kind: "text", x: 10, y: 28, w: 73, h: 33, fontSize: 2.6, fontRole: "heading", fontWeight: 400, color: "textPrimary", align: "left", lineHeight: 1.55 }
  attribution: { kind: "text", x: 10, y: 65, w: 73, h: 5, fontSize: 1.5, fontRole: "body", fontWeight: 500, color: "textMuted", align: "left", textTransform: "uppercase" }

TIMELINE (numbered, vertical):
  heading: { kind: "text", x: 6, y: 7, w: 88, h: 8, fontSize: 2.5, fontRole: "heading", fontWeight: 600, color: "textPrimary" }
  For each step: number text (fontSize=1.9, fontWeight=700, color="accent") + title + body, with line dividers

TIMELINE (horizontal axis):
  heading: { kind: "text", x: 6, y: 7, w: 88, h: 10, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent" }
  axis: { kind: "shape", shape: "line", x: 6, y: 40, w: 88, h: 0, stroke: "border", strokeWidth: 2 }
  For each event: vertical tick line + title below + body below title

HERO (split — text left, image right):
  image: { kind: "image", x: 50, y: 0, w: 50, h: 100, src: "..." }
  heading: { kind: "text", x: 6, y: 9, w: 40, h: 19, fontSize: 3.3, fontRole: "heading", fontWeight: 700, color: "accent", textTransform: "uppercase" }
  body: { kind: "text", x: 6, y: 30, w: 40, h: 37, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "textSecondary", lineHeight: 1.7 }

HERO (overlay — full image with gradient + text at bottom):
  image: { kind: "image", x: 0, y: 0, w: 100, h: 100, src: "..." }
  gradient: { kind: "shape", shape: "rect", x: 0, y: 40, w: 100, h: 60, fill: "rgba(0,0,0,0.7)" }
  heading: { kind: "text", x: 6, y: 67, w: 88, h: 15, fontSize: 4.2, fontRole: "heading", fontWeight: 700, color: "#ffffff" }
  body: { kind: "text", x: 6, y: 83, w: 88, h: 9, fontSize: 1.9, fontRole: "body", fontWeight: 400, color: "rgba(255,255,255,0.88)" }

TABLE:
  heading + header row (bold text elements) + data rows (regular text) + line dividers between rows

FOCUS (metric — huge centered number):
  Same as STATS large.

FOCUS (accent — centered statement with underline):
  title: { kind: "text", x: 7.5, y: 26, w: 85, h: 22, fontSize: 5.2, fontRole: "heading", fontWeight: 700, color: "textPrimary", align: "center" }
  underline: { kind: "shape", shape: "rect", x: 47, y: 50, w: 6, h: 0.6, fill: "accent", cornerRadius: 0.2 }
  subtitle: { kind: "text", x: 10, y: 54, w: 80, h: 9, fontSize: 3, fontRole: "heading", fontWeight: 500, color: "textSecondary", align: "center" }

DESIGN RULES:
- Each slide and element MUST have a unique id.
- LAYOUT VARIETY IS MANDATORY. Do not reuse the same content-slide template more than twice in a deck. If your deck has 4 content slides, pick 4 different templates. A deck where every content slide is hairline cells looks monotonous — force yourself to reach for other patterns.

LAYOUT PICKER — match content shape to template, don't default to grids:
- Sequence through time (seasons, phases, steps, months, timelines) → TIMELINE (horizontal axis) or TIMELINE (numbered vertical). NOT cells.
- Rows of the same schema (plant × zone × note; pest × sign × fix) → TABLE with serif name column + mono tag column + body column.
- Single memorable number or statement → FOCUS (large featured number) or STATS (large).
- Running prose explanation → TEXT (prose) or TEXT (two-column).
- Short list of ≤ 6 items with short descriptions → TEXT (bullets) — reach for this before cells.
- Memorable quote, proverb, or one-liner → QUOTE (offset).
- 3–6 categorical cards where each card has title + body and no natural order → STATS (hairline cells) or LIST (hairline entries). This is the LAST resort, not the default.
- Image-forward visual → HERO (split or overlay).

- Keep text concise. Slides are visual — avoid paragraphs.
- When using icons, place them as small elements (w≈3, h≈5, fontSize≈2.5) near related text.
- For per-slide background: set "background" field on the slide object.

IMAGES — CRITICAL:
- Do NOT use web search, search_images, or arbitrary URLs.
- ONLY ways to get images:
  1. User-attached: "attached:0", "attached:1", etc. Resolved to data URLs automatically.
  2. AnumaImageMCP-generate_cloud_image: generate 1-2 max, use returned URLs.
- Most slides should be text-only. If no images available, omit image elements entirely.
- WORKFLOW WITH IMAGES: First generate all images, collect their URLs, THEN create the deck JSON with those URLs in a single create_file call. Do NOT create the deck before images are ready — the deck renders the moment create_file succeeds.

CHOOSING A PALETTE — don't default to dark grey + orange for everything. Match tone to topic:
- Warm editorial (guides, culture, cooking, nature): cream + moss/terracotta. Use fontPreset "editorial" or "humanist".
- Techno dark (dev tools, infra, product launches): near-black + electric accent. Use fontPreset "techno" or "bold".
- Clean minimal (business, enterprise, finance): white + one restrained accent. Use fontPreset "clean" or "geometric".

Three short examples — pick the register closest to the topic, don't copy palettes verbatim:

EXAMPLE A — Warm editorial (guide/culture):
{
  "version": 2,
  "theme": {
    "fontPreset": "editorial",
    "colors": {
      "background": "#F3EEE5", "slideBg": "#F3EEE5", "surfaceSecondary": "#EDE6D8",
      "textPrimary": "#1F2A22", "textSecondary": "#4A5449", "textMuted": "#8A8F84",
      "accent": "#6B8246", "card": "#EDE6D8", "border": "#CFC8B8"
    }
  },
  "slides": [
    { "id": "cover", "elements": [
      { "id": "eyebrow", "kind": "text", "text": "HOME GARDENING · FUNDAMENTALS", "x": 6, "y": 30, "w": 60, "h": 3.5, "fontSize": 1.4, "fontRole": "body", "fontWeight": 500, "color": "accent", "fontFamily": "JetBrains Mono", "letterSpacing": 0.16, "textTransform": "uppercase" },
      { "id": "title", "kind": "text", "text": "The Growing Year.", "x": 6, "y": 36, "w": 88, "h": 30, "fontSize": 9.5, "fontRole": "heading", "fontWeight": 400, "color": "textPrimary", "fontStyle": "italic", "align": "left", "lineHeight": 0.95 },
      { "id": "sub", "kind": "text", "text": "Soil, seasons, pests, and starter plants.", "x": 6, "y": 70, "w": 60, "h": 6, "fontSize": 2.2, "fontRole": "body", "fontWeight": 400, "color": "textSecondary", "align": "left" }
    ]}
  ]
}

EXAMPLE B — Techno dark (tech/product):
{
  "version": 2,
  "theme": {
    "fontPreset": "techno",
    "colors": {
      "background": "#0a0b0e", "slideBg": "#0a0b0e", "surfaceSecondary": "#12151a",
      "textPrimary": "#e8eaed", "textSecondary": "#c4c7cc", "textMuted": "#7c828b",
      "accent": "#6ee7b7", "card": "#12151a", "border": "#2a2e36"
    }
  },
  "slides": [
    { "id": "focus", "elements": [
      { "id": "eyebrow", "kind": "text", "text": "Q4 · THROUGHPUT", "x": 6, "y": 9, "w": 40, "h": 3.5, "fontSize": 1.4, "fontRole": "body", "fontWeight": 500, "color": "textMuted", "letterSpacing": 0.16, "textTransform": "uppercase" },
      { "id": "num", "kind": "text", "text": "50M+", "x": 6, "y": 30, "w": 88, "h": 30, "fontSize": 12, "fontRole": "heading", "fontWeight": 700, "color": "accent", "align": "left", "lineHeight": 1.0 },
      { "id": "lbl", "kind": "text", "text": "API calls processed daily — 3x last quarter.", "x": 6, "y": 64, "w": 70, "h": 6, "fontSize": 2, "fontRole": "body", "fontWeight": 400, "color": "textSecondary", "align": "left" }
    ]}
  ]
}

EXAMPLE C — Clean minimal (business):
{
  "version": 2,
  "theme": {
    "fontPreset": "clean",
    "colors": {
      "background": "#ffffff", "slideBg": "#ffffff", "surfaceSecondary": "#f8fafc",
      "textPrimary": "#0f172a", "textSecondary": "#475569", "textMuted": "#94a3b8",
      "accent": "#2563eb", "card": "#f8fafc", "border": "#e2e8f0"
    }
  },
  "slides": [
    { "id": "table", "elements": [
      { "id": "eyebrow", "kind": "text", "text": "Q4 · ACCOUNT SUMMARY", "x": 6, "y": 9, "w": 80, "h": 3.5, "fontSize": 1.4, "fontRole": "body", "fontWeight": 500, "color": "textMuted", "fontFamily": "JetBrains Mono", "letterSpacing": 0.16, "textTransform": "uppercase" },
      { "id": "title", "kind": "text", "text": "Top movers", "x": 6, "y": 14, "w": 88, "h": 10, "fontSize": 5.2, "fontRole": "heading", "fontWeight": 600, "color": "textPrimary", "align": "left", "lineHeight": 1.0 },
      { "id": "rule", "kind": "shape", "shape": "line", "x": 6, "y": 26, "w": 88, "h": 0, "stroke": "border", "strokeWidth": 1 },
      { "id": "h1", "kind": "text", "text": "ACCOUNT", "x": 6, "y": 32, "w": 40, "h": 3.5, "fontSize": 1.3, "fontRole": "body", "fontWeight": 500, "color": "textMuted", "fontFamily": "JetBrains Mono", "letterSpacing": 0.14, "textTransform": "uppercase" },
      { "id": "h2", "kind": "text", "text": "CHANGE", "x": 48, "y": 32, "w": 18, "h": 3.5, "fontSize": 1.3, "fontRole": "body", "fontWeight": 500, "color": "textMuted", "fontFamily": "JetBrains Mono", "letterSpacing": 0.14, "textTransform": "uppercase" },
      { "id": "h3", "kind": "text", "text": "NOTE", "x": 68, "y": 32, "w": 26, "h": 3.5, "fontSize": 1.3, "fontRole": "body", "fontWeight": 500, "color": "textMuted", "fontFamily": "JetBrains Mono", "letterSpacing": 0.14, "textTransform": "uppercase" },
      { "id": "l0", "kind": "shape", "shape": "line", "x": 6, "y": 37, "w": 88, "h": 0, "stroke": "border", "strokeWidth": 1 },
      { "id": "r1n", "kind": "text", "text": "Acme Robotics", "x": 6, "y": 40, "w": 40, "h": 6, "fontSize": 2.6, "fontRole": "heading", "fontWeight": 400, "color": "textPrimary" },
      { "id": "r1c", "kind": "text", "text": "+38%", "x": 48, "y": 41, "w": 18, "h": 5, "fontSize": 2, "fontRole": "body", "fontWeight": 500, "color": "accent" },
      { "id": "r1b", "kind": "text", "text": "Expanded to 4 regions.", "x": 68, "y": 41, "w": 26, "h": 6, "fontSize": 1.5, "fontRole": "body", "color": "textSecondary" },
      { "id": "l1", "kind": "shape", "shape": "line", "x": 6, "y": 49, "w": 88, "h": 0, "stroke": "border", "strokeWidth": 1 },
      { "id": "r2n", "kind": "text", "text": "Northwind", "x": 6, "y": 52, "w": 40, "h": 6, "fontSize": 2.6, "fontRole": "heading", "fontWeight": 400, "color": "textPrimary" },
      { "id": "r2c", "kind": "text", "text": "+22%", "x": 48, "y": 53, "w": 18, "h": 5, "fontSize": 2, "fontRole": "body", "fontWeight": 500, "color": "accent" },
      { "id": "r2b", "kind": "text", "text": "Added seat-based billing.", "x": 68, "y": 53, "w": 26, "h": 6, "fontSize": 1.5, "fontRole": "body", "color": "textSecondary" },
      { "id": "l2", "kind": "shape", "shape": "line", "x": 6, "y": 61, "w": 88, "h": 0, "stroke": "border", "strokeWidth": 1 },
      { "id": "r3n", "kind": "text", "text": "Contoso", "x": 6, "y": 64, "w": 40, "h": 6, "fontSize": 2.6, "fontRole": "heading", "fontWeight": 400, "color": "textPrimary" },
      { "id": "r3c", "kind": "text", "text": "+18%", "x": 48, "y": 65, "w": 18, "h": 5, "fontSize": 2, "fontRole": "body", "fontWeight": 500, "color": "accent" },
      { "id": "r3b", "kind": "text", "text": "Consolidated tiers.", "x": 68, "y": 65, "w": 26, "h": 6, "fontSize": 1.5, "fontRole": "body", "color": "textSecondary" }
    ]}
  ]
}`;
}
