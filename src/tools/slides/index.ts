/**
 * Slide deck tools for LLM-driven presentation generation.
 *
 * Provides plan_deck, add_slide, read_slides, and patch_slides tool
 * configurations, along with the type system, coordinate helpers, font
 * presets, and system prompt that drive the slide generation flow.
 *
 * Slide decks are JSON documents persisted to a file named `slides.json`
 * via the shared `AppFileStorage` interface. The LLM initializes an empty
 * deck with `plan_deck`, appends slides one at a time via `add_slide`,
 * and applies incremental edits with `patch_slides`. All positions use a
 * percentage-based coordinate system relative to a 960×540 (16:9)
 * reference canvas.
 *
 * When a `displaySlides` callback is supplied to `createSlideTools`, the
 * deck-display UI interaction is emitted automatically from inside
 * `plan_deck`, `add_slide`, and `patch_slides` — no separate display
 * tool needed. The SDK tracks the interaction_id internally so per-slide
 * appends update the same viewer in-place.
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
import { renderLayoutCatalog, renderLayoutTemplates, renderSharedHeader } from "./layouts";
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
  description: `Apply targeted operations to an existing slide deck. The deck re-renders inline automatically after each patch; pass replaces_interaction_id from a previous add_slide/patch_slides result to update the same deck viewer in-place (otherwise a new viewer is created).

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
          "interaction_id from a previous add_slide or patch_slides result. Pass this to update the existing deck viewer in-place instead of creating a new one.",
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

export const PLAN_DECK_SCHEMA = {
  name: "plan_deck",
  description: `Initialize a new slide deck. Call this FIRST — once — to set up the theme, title, and display. You pick:
  - title: presentation title (shown above the deck in the UI)
  - fontPreset: one of the font-preset keys
  - paletteName: the register name from the palette table (e.g. "warm editorial", "techno dark")

The result contains the full layout catalog with element recipes, shared header pattern, element-type schemas, coordinate-system notes, and the palette hex values — everything you need for the add_slide calls that follow.

After plan_deck, call add_slide ONCE PER SLIDE, in order, appending slides to the deck. Aim for at least 8–12 slides for a substantive topic. Each add_slide call writes one slide's elements.

For editing an existing deck (read_slides + patch_slides flow), do NOT call plan_deck.`,
  arguments: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the presentation (shown above the deck in the UI).",
      },
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
    },
    required: ["title", "fontPreset", "paletteName"],
  },
} as const;

export const ADD_SLIDE_SCHEMA = {
  name: "add_slide",
  description: `Append ONE slide to the deck. Call this repeatedly after plan_deck, once per slide, in order. Each call writes a single slide — you pick a layout name from the LAYOUT CATALOG (in the plan_deck result), copy its element recipe, and substitute real text. The deck re-renders inline after each add_slide so the viewer updates in-place.

IMPORTANT: Call add_slide ONE AT A TIME (sequentially, one call per assistant turn). Do NOT emit multiple add_slide tool calls in parallel in a single turn — they race on shared deck state and slides will be lost. Wait for each add_slide result before emitting the next.

Slide shape: { id, background?, elements: SlideElement[] }

Layout variety is mandatory — don't reuse the same layout more than twice in a deck. Include the shared header pattern on every content slide (skip on cover + section-dark chapter breaks).`,
  arguments: {
    type: "object",
    properties: {
      slide: {
        type: "object",
        description: "One Slide: { id, background?, elements: SlideElement[] }",
        properties: {
          id: { type: "string", description: "Short snake-case slide id (e.g. 'cover', 'soil_intro')" },
          background: {
            type: "string",
            description:
              "Optional slide background hex or color token. Overrides theme slideBg for this slide only.",
          },
          elements: {
            type: "array",
            description: "Array of SlideElement objects (text/shape/image/icon).",
            items: { type: "object", properties: {}, additionalProperties: true },
          },
        },
        required: ["id", "elements"],
      },
    },
    required: ["slide"],
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
   * automatically from inside `plan_deck`, `add_slide`, and `patch_slides`;
   * its return value is merged into the tool result so the model (and the
   * chat UI) see the `interaction_id`. Receives `{ title, replaces_interaction_id }`.
   *
   * The SDK tracks the interaction_id internally per conversation so
   * per-slide appends update the same viewer — the model does not need
   * to thread the id through its tool arguments.
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
 * Create the slide deck tool suite: `plan_deck`, `add_slide`, `read_slides`,
 * and `patch_slides`.
 *
 * New decks flow: plan_deck (once) → add_slide (once per slide, in order).
 * Existing deck edits: read_slides → patch_slides.
 *
 * When `displaySlides` is provided, `plan_deck`, `add_slide`, and
 * `patch_slides` all emit the deck-display UI interaction as part of
 * their result. No standalone `display_slides` tool — the write and the
 * display anchor are a single step, and the SDK tracks the interaction
 * id per conversation so per-slide appends update the same viewer
 * in-place.
 *
 * Backed by the provided storage adapter. No dependency on the
 * app-generation `create_file` tool — `plan_deck` initializes slides.json
 * and `add_slide` appends to it directly.
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

  // Tracks the last displaySlides interaction_id per conversation so that
  // add_slide / patch_slides calls can update the same deck viewer in-place
  // (via replaces_interaction_id) instead of spawning new viewers for each
  // incremental write. Populated by plan_deck and refreshed by add_slide.
  const lastInteractionByConv = new Map<string, { id: string; title: string }>();

  // Per-conversation write lock. Serializes the read-modify-write sequence
  // inside add_slide so that if a model emits multiple add_slide tool calls
  // in parallel in a single turn, each one sees the result of the previous
  // rather than racing on slides.json. Chain via Promise so queued callers
  // await the previous write to complete.
  const writeLockByConv = new Map<string, Promise<void>>();
  async function withWriteLock<T>(cid: string, fn: () => Promise<T>): Promise<T> {
    const prev = writeLockByConv.get(cid) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => {
      release = r;
    });
    writeLockByConv.set(
      cid,
      prev.then(() => next)
    );
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  const planDeckTool: ToolConfig = {
    type: "function",
    function: PLAN_DECK_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const title = typeof args.title === "string" ? args.title : "";
        const fontPreset = typeof args.fontPreset === "string" ? args.fontPreset : "";
        const paletteName = typeof args.paletteName === "string" ? args.paletteName : "";

        if (!title) {
          return { error: "title is required" };
        }
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

        // Initialize an empty deck with the chosen theme — add_slide appends
        // individual slides into this shell.
        const deck: SlideDeck = {
          version: 2,
          theme: { fontPreset: palette.fontPreset, colors: palette.colors },
          slides: [],
        };
        await storage.putFile(conversationId, "slides.json", JSON.stringify(deck));

        // Open a display interaction now so the viewer appears and add_slide
        // calls can update it in-place.
        const display = displaySlides ? await displaySlides({ title }) : null;
        const interactionId =
          display && typeof display === "object" && "interaction_id" in display
            ? (display as { interaction_id?: unknown }).interaction_id
            : undefined;
        if (typeof interactionId === "string") {
          lastInteractionByConv.set(conversationId, { id: interactionId, title });
        }

        const content = `Deck initialized — theme applied, empty slides array ready.

Theme: ${palette.name} (fontPreset: ${palette.fontPreset})
Palette colors (already applied to theme.colors):
${renderPaletteColors(palette)}

COORDINATE SYSTEM — positions are percentages (0–100) of a 16:9 canvas (960×540 reference).
- x=0 left, x=100 right, y=0 top, y=100 bottom
- Standard padding: x≈6, y≈9. Content area: x=6–94, y=9–91
- fontSize is percentage of canvas width: 4.5 ≈ 43px heading, 1.9 ≈ 18px body

ELEMENT TYPES:
${renderElementKinds()}

SHARED HEADER PATTERN — place on every content slide (skip on cover and chapter-break):
${renderSharedHeader()}

LAYOUT RECIPES — pick one for each slide; copy the element geometry and substitute your text:

${renderLayoutTemplates()}

NOW call add_slide ONE SLIDE AT A TIME, in order. Produce AT LEAST 10 slides for a substantive topic (12–14 is a typical good deck). Do not stop early — if the user asked for N slides, you must call add_slide at least N times. For each slide: pick a layout, copy its elements, substitute real text. LAYOUT VARIETY IS MANDATORY — do not reuse the same layout more than twice. Each add_slide call re-renders the deck in-place.`;

        return {
          content,
          ...(display && typeof display === "object" ? display : {}),
        };
      } catch (err) {
        logError("plan_deck failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to plan deck: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const addSlideTool: ToolConfig = {
    type: "function",
    function: ADD_SLIDE_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const slide = args.slide as Slide | undefined;
        if (!slide || typeof slide !== "object") {
          return { error: "slide is required and must be a Slide object" };
        }
        if (typeof slide.id !== "string" || !slide.id) {
          return { error: "slide.id is required" };
        }
        if (!Array.isArray(slide.elements)) {
          return { error: "slide.elements must be an array" };
        }

        // Serialize the read-modify-write so parallel add_slide tool calls
        // in a single assistant turn don't race on slides.json.
        return await withWriteLock(conversationId, async () => {
          const file = await storage.getFile(conversationId, "slides.json");
          if (!file) {
            return { error: "No slides.json found. Call plan_deck first." };
          }
          const deck = JSON.parse(file.content) as SlideDeck;
          deck.slides.push(slide);
          await storage.putFile(conversationId, "slides.json", JSON.stringify(deck));

          // Update the display interaction in-place. If plan_deck already
          // created one, reuse its interaction_id so the viewer updates.
          const prev = lastInteractionByConv.get(conversationId);
          const displayArgs: Record<string, unknown> = prev
            ? { replaces_interaction_id: prev.id }
            : {};
          const display = displaySlides ? await displaySlides(displayArgs) : null;
          if (display && typeof display === "object" && "interaction_id" in display) {
            const newId = (display as { interaction_id?: unknown }).interaction_id;
            if (typeof newId === "string") {
              lastInteractionByConv.set(conversationId, {
                id: newId,
                title: prev?.title ?? "",
              });
            }
          }

          return {
            success: true,
            slideIndex: deck.slides.length - 1,
            totalSlides: deck.slides.length,
            message: `Appended slide ${deck.slides.length} (id=${slide.id}).`,
            ...(display && typeof display === "object" ? display : {}),
          };
        });
      } catch (err) {
        logError("add_slide failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to add slide: ${err instanceof Error ? err.message : String(err)}`,
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
        if (!file) return { error: "No slides.json found. Call plan_deck first." };

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

        // Prefer the model-supplied replaces_interaction_id, but fall back to
        // the closure-tracked id from plan_deck / add_slide so patch_slides
        // updates the same viewer even if the model forgets to thread the id.
        const replacesId =
          typeof args.replaces_interaction_id === "string"
            ? args.replaces_interaction_id
            : lastInteractionByConv.get(conversationId)?.id;
        const display = displaySlides
          ? await displaySlides(replacesId ? { replaces_interaction_id: replacesId } : {})
          : null;
        if (display && typeof display === "object" && "interaction_id" in display) {
          const newId = (display as { interaction_id?: unknown }).interaction_id;
          if (typeof newId === "string") {
            const prev = lastInteractionByConv.get(conversationId);
            lastInteractionByConv.set(conversationId, {
              id: newId,
              title: prev?.title ?? "",
            });
          }
        }
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

  return [planDeckTool, addSlideTool, readSlidesTool, patchSlidesTool];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * Build the slide mode system prompt — slim initialize + per-slide flow.
 *
 * Instructs the LLM to call plan_deck once (picks title + palette +
 * fontPreset, initializes an empty slides.json, returns the full layout
 * recipes + element-type schemas + shared header + palette hex values),
 * then call add_slide once per slide to append. Per-slide rounds keep
 * each tool-call stream small so slow / reasoning-heavy models can finish
 * within portal per-provider timeout ceilings.
 */
export function buildSlideSystemPrompt(): string {
  const fontTable = Object.entries(FONT_PRESETS)
    .map(([name, p]) => `  ${name}: heading="${p.heading}", body="${p.body}"`)
    .join("\n");

  return `You are a presentation design assistant. You produce polished slide decks as JSON with positioned elements.

WORKFLOW (initialize then add slides one at a time):
1. INITIALIZE — call plan_deck ONCE with { title, fontPreset, paletteName }. This sets up the theme and returns the full LAYOUT RECIPES, SHARED HEADER, element schemas, coordinate-system notes, and palette hex values. Pick fontPreset + paletteName to match the topic (see CHOOSING A PALETTE).
2. APPEND — call add_slide ONE SLIDE AT A TIME, in order, aiming for at least 8–12 slides for a substantive topic. For each slide: pick a layout from the LAYOUT CATALOG, copy its element recipe, substitute your real text, and pass the Slide object as { slide: { id, background?, elements: [...] } }. The deck re-renders in-place after each call.

For edits to an existing deck: read_slides → patch_slides. No plan_deck needed for edits.

Never output code as text. Always use tools. Keep text responses to one or two sentences.

LAYOUT CATALOG — each entry is "short-name — description". Pick one when writing each slide's elements:

${renderLayoutCatalog()}

LAYOUT PICKER — match content shape to a template, don't default to grids:
- Sequence through time (seasons, phases, steps, months) → timeline-horizontal, timeline-numbered, or timeline-table.
- Rows with the same schema (plant × zone × note; year × event × note) → table or timeline-table.
- Single memorable number → stats-large or stats-inline.
- Single memorable statement → focus-statement.
- Mega-number paired with what-it-unlocks → focus-number-list.
- Two-panel contrast (classical vs quantum, before vs after) → compare-two-panel.
- Two-column comparison with enumerated steps/items (old way vs new way, before/after process) → compare-lists.
- Case study / product profile / review by attribute (big title + body + 6 key-value rows) → profile-spec.
- Character / persona study with parallel facets (want/need/flaw/fate, or what/why/how/for-whom) → profile-quadrant.
- Three-way taxonomy / tier comparison in plain text (no boxes, no grids) → text-three-col.
- Brand palette / color system / category legend with colored chips → palette-swatches.
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

CHOOSING A PALETTE — don't default to dark grey + orange. Pick the register that matches the topic; plan_deck will inject its hex values for you. Don't invent new palettes unless the topic really demands it.

${renderPaletteNames()}

IMAGES:
- Do NOT use web search or arbitrary URLs. Only "attached:N" strings (user-attached images) or URLs from AnumaImageMCP-generate_cloud_image (generate 1–2 max first).
- Most decks should be text-only. If no images are available, omit image elements entirely.
- With images: generate them FIRST, then call plan_deck and add_slide — the deck renders incrementally as slides are appended.

ICONS: Material Symbols Rounded — bolt, lock, search, favorite, star, check_circle, trending_up, rocket_launch, groups, code, brush, settings, etc.

COLOR TOKENS: textPrimary, textSecondary, textMuted, accent, card, border, background, slideBg`;
}
