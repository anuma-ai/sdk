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

import type { ToolConfig } from "../../lib/chat/useChat/types.js";
import type { AppFileStorage } from "../appGeneration";
import { renderLayoutTemplates } from "./layouts";
import { renderPalettes } from "./palettes";

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

  // Layouts are typed SlideElement[] values in ./layouts.ts. `renderLayoutTemplates`
  // walks the catalog and emits the prose block the LLM reads, with each
  // layout name followed by its notes (if any) and element recipes.
  const layoutTemplates = renderLayoutTemplates();

  // Palettes live in ./palettes.ts as typed `Palette[]` (register + fontPreset
  // + colors). `renderPalettes` emits a compact table the LLM reads when
  // picking a register to match the topic.
  const palettes = renderPalettes();

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

${layoutTemplates}

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

CHOOSING A PALETTE — don't default to dark grey + orange for every deck. Pick a register below to match the topic, then copy its fontPreset and colors verbatim into theme. Don't invent new palettes unless the topic really demands it; picking from this list is the expected path.

${palettes}`;
}
