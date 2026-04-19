/**
 * Slide generation tools for creating and editing presentation decks.
 *
 * Provides create_slides, read_slides, and patch_slides tool configurations.
 * The tools operate on a pluggable storage backend (same `AppFileStorage`
 * interface used by app generation tools) and store the deck as `slides.json`.
 *
 * @example
 * ```typescript
 * import { createSlideGenerationTools } from "@anuma/sdk/tools";
 *
 * const tools = createSlideGenerationTools({
 *   getConversationId: () => currentConversationId,
 *   storage: myStorageAdapter,
 * });
 * ```
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { AppFileStorage } from "./appGeneration.js";

// ---------------------------------------------------------------------------
// Slide types (minimal — no rendering concerns, just the data model)
// ---------------------------------------------------------------------------

export interface SlideElement {
  id: string;
  kind: "text" | "image" | "shape" | "icon";
  x: number;
  y: number;
  w: number;
  h: number;
  [key: string]: unknown;
}

export interface Slide {
  id: string;
  elements: SlideElement[];
  background?: string;
}

export interface SlideDeck {
  version: number;
  theme: Record<string, unknown>;
  slides: Slide[];
}

// ---------------------------------------------------------------------------
// Tool name constants
// ---------------------------------------------------------------------------

export const SLIDE_TOOL_NAMES: ReadonlySet<string> = Object.freeze(
  new Set(["create_slides", "read_slides", "patch_slides"])
);

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

export const CREATE_SLIDES_SCHEMA = {
  name: "create_slides",
  description:
    'Creates a new slide deck. Pass the full SlideDeck JSON object as the "deck" argument. The deck renders automatically once written — no separate display tool needed.',
  arguments: {
    type: "object",
    properties: {
      deck: {
        type: "object",
        description: "Full SlideDeck JSON object with version, theme, and slides array",
        additionalProperties: true,
      },
    },
    required: ["deck"],
  },
} as const;

export const READ_SLIDES_SCHEMA = {
  name: "read_slides",
  description:
    "Returns the current slide deck content from slides.json. Use this before patch_slides to see what needs changing.",
  arguments: {
    type: "object",
    properties: {},
  },
} as const;

export const PATCH_SLIDES_SCHEMA = {
  name: "patch_slides",
  description: `Applies targeted operations to the slide deck. Use this instead of create_slides for incremental changes.

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deep-merge own, non-prototype keys to prevent prototype pollution.
 * Nested plain objects are merged recursively so partial updates
 * (e.g. updating a single color in theme.colors) don't destroy siblings.
 */
function safeMerge(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const key of Object.keys(patch)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const tVal = target[key];
    const pVal = patch[key];
    if (
      tVal && pVal &&
      typeof tVal === "object" && typeof pVal === "object" &&
      !Array.isArray(tVal) && !Array.isArray(pVal)
    ) {
      safeMerge(tVal as Record<string, unknown>, pVal as Record<string, unknown>);
    } else {
      target[key] = pVal;
    }
  }
}

/**
 * Extract slide content from a SlideDeck JSON string for the LLM.
 * Returns compact element data so the LLM can see positions and content.
 */
export function extractSlideContent(json: string): string {
  try {
    const deck = JSON.parse(json) as SlideDeck;
    return deck.slides
      .map((s, i) => {
        const summary = s.elements
          .map((el) => {
            if (el.kind === "text")
              return `  [${el.id}] text "${((el.text as string) ?? "").slice(0, 40)}" at (${el.x},${el.y}) ${el.w}x${el.h}`;
            if (el.kind === "shape")
              return `  [${el.id}] ${String(el.shape)} at (${el.x},${el.y}) ${el.w}x${el.h}`;
            if (el.kind === "icon") return `  [${el.id}] icon "${String(el.name)}" at (${el.x},${el.y})`;
            if (el.kind === "image")
              return `  [${el.id}] image at (${el.x},${el.y}) ${el.w}x${el.h}`;
            return `  [${el.id}] ${el.kind as string}`;
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

export interface CreateSlideGenerationToolsOptions {
  /** Returns the current conversation ID (may be null before first message). */
  getConversationId: () => string | null;
  /** Storage backend for file operations (same interface as app generation). */
  storage: Pick<AppFileStorage, "getFile" | "putFile">;
  /** Optional error logger. Falls back to no-op. */
  logError?: (message: string, error?: Error) => void;
}

/**
 * Creates the suite of slide generation tools (create_slides, read_slides,
 * patch_slides) backed by the provided storage adapter.
 *
 * All tools operate on `slides.json` within the conversation's file storage.
 * `create_slides` has `skipContinuation: true` so the deck renders immediately
 * without a second LLM round-trip.
 */
export function createSlideGenerationTools({
  getConversationId,
  storage,
  logError = () => {},
}: CreateSlideGenerationToolsOptions): ToolConfig[] {
  function requireConversationId(): string {
    const id = getConversationId();
    if (!id) throw new Error("No active conversation");
    return id;
  }

  const createSlidesTool: ToolConfig = {
    type: "function",
    function: CREATE_SLIDES_SCHEMA,
    skipContinuation: true,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const deck = args.deck;
        if (!deck || typeof deck !== "object") {
          return { error: "deck argument is required and must be a JSON object" };
        }
        const content = JSON.stringify(deck);
        await storage.putFile(conversationId, "slides.json", content);
        return {
          success: true,
          slideCount: (deck as { slides?: unknown[] }).slides?.length ?? 0,
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
        if (!file)
          return {
            error: "No slides.json found. Use create_slides first.",
          };

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
              if (op.afterSlideId && insertIdx === -1) {
                results.push(
                  `add_slide: afterSlideId ${op.afterSlideId} not found`
                );
                break;
              }
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

  return [createSlidesTool, readSlidesTool, patchSlidesTool];
}
