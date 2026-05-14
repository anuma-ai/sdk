/**
 * Slide deck tools for LLM-driven presentation generation.
 *
 * Provides plan_deck, add_slide, read_slides, and patch_slides tool
 * configurations, along with the type system, coordinate helpers, font
 * presets, and system prompt that drive the slide generation flow.
 *
 * Slide decks are stored as a JSX document (rooted at `<Anuma.Deck>`) in
 * a file named `slides.jsx` via the shared `AppFileStorage` interface. The
 * LLM initializes an empty deck with `plan_deck`, appends slides one at a
 * time via `add_slide`, and applies incremental edits with `patch_slides`.
 * All positions use container-relative pixels on a 960×540 slide canvas.
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
import { isKnownFont, renderFontLibrary } from "./fonts";

export type { FontCategory, FontSpec } from "./fonts";
export { buildFontsUrl, FONT_LIBRARY, getFontByName, isKnownFont } from "./fonts";
export type { LegacyDeckJson } from "./legacy";
export { convertLegacyDeckJson, isLegacyDeckJson } from "./legacy";
import type { AnumaNode } from "./jsx";
import {
  AnumaJsxError,
  getId,
  insertChild,
  parseJsx,
  removeById,
  replaceById,
  serializeJsx,
  updateAttrs,
  walk,
} from "./jsx";
import { getPaletteByName, renderPaletteColors, renderPaletteNames } from "./palettes";
import {
  compositionSlideBackground,
  listCompositionDescriptions,
  listCompositionLayoutNames,
  IMAGE_PLACEHOLDER_SENTINEL,
  listDesignSystemNames,
  renderDesignSystemCatalog,
  renderCompositionLayoutRecipe,
  resolveCompositionLayout,
  validateSlotContent,
} from "./designSystem";

export type { AnumaChild, AnumaNode, AttrValue, KnownTag } from "./jsx";
export {
  AnumaJsxError,
  findById,
  findParentOfId,
  getId,
  getNumberAttr,
  getStringAttr,
  insertAfterId,
  insertChild,
  isAnumaTag,
  isHtmlTag,
  parseJsx,
  removeById,
  replaceById,
  serializeJsx,
  updateAttrs,
  walk,
} from "./jsx";

// ---------------------------------------------------------------------------
// Canvas dimensions — every coordinate in the vocabulary is container-
// relative pixels. Slide canvas is 960×540.
// ---------------------------------------------------------------------------

export const SLIDE_CANVAS_WIDTH = 960;
export const SLIDE_CANVAS_HEIGHT = 540;

// ---------------------------------------------------------------------------
// Theme colour tokens referenced by name in `color` / `fill` / `stroke`
// attrs. A default theme is applied by `plan_deck` via the selected palette.
// ---------------------------------------------------------------------------

export const THEME_ATTRS = [
  "background",
  "slideBg",
  "surfaceSecondary",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "accent",
  "card",
  "border",
] as const;

export type ThemeAttr = (typeof THEME_ATTRS)[number];

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
// Layout + geometry vocabulary (describing attribute names the LLM uses).
// All coordinates are container-relative pixels; fontSize is px too.
// ---------------------------------------------------------------------------

/** Layout modes a container (Deck/Slide/Group) may opt into. */
export const LAYOUT_MODES = ["absolute", "row", "column"] as const;

export type LayoutMode = (typeof LAYOUT_MODES)[number];

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

export const READ_SLIDES_SCHEMA = {
  name: "read_slides",
  description:
    "Returns the current slide deck as an <Anuma.Deck> JSX document. Use this before patch_slides to see what needs changing.",
  arguments: {
    type: "object",
    properties: {},
  },
} as const;

export const PATCH_SLIDES_SCHEMA = {
  name: "patch_slides",
  description: `Apply patch operations to an existing slide deck — change a slide's text, swap a layout, update the theme, or add and remove slides. Pair with read_slides when the user wants to change something in their deck.

The deck re-renders inline automatically after each patch; pass replaces_interaction_id from a previous add_slide/patch_slides result to update the same deck viewer in-place (otherwise a new viewer is created).

Operations (set 'action' and the fields noted):
- replace_element: { slideId, elementId, jsx } — replace a matched element with a new content-element JSX fragment (e.g. <Anuma.Text …>…</Anuma.Text>).
- insert_element: { slideId, jsx, afterElementId? } — insert a new content-element JSX fragment. Appends to the end when afterElementId is omitted.
- remove_element: { slideId, elementId }.
- replace_slide: { slideId, jsx } — replace an entire <Anuma.Slide> with a new JSX fragment (root must be <Anuma.Slide>).
- insert_slide: { jsx, afterSlideId? } — insert a new <Anuma.Slide>. Appends to the end when afterSlideId is omitted.
- remove_slide: { slideId }.
- update_theme: { set: { fontPreset?, colors? } } — structured partial patch for theme metadata (no tree shape to rewrite).`,
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
                "replace_element",
                "insert_element",
                "remove_element",
                "replace_slide",
                "insert_slide",
                "remove_slide",
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
              description: "Target element id (for replace_element and remove_element)",
            },
            jsx: {
              type: "string",
              description:
                "JSX fragment: an <Anuma.Slide> for slide ops, or a single content element (<Anuma.Text>, <Anuma.Image>, <Anuma.Rect>, <Anuma.Circle>, <Anuma.Line>, <Anuma.Icon>, <Anuma.Group>) for element ops.",
            },
            afterSlideId: {
              type: "string",
              description: "Insert new slide after this id. Omit to append at the end.",
            },
            afterElementId: {
              type: "string",
              description:
                "Insert new element after this id within the target slide. Omit to append at the end.",
            },
            set: {
              type: "object",
              properties: {},
              additionalProperties: true,
              description: "For update_theme: partial theme fields to merge (fontPreset, colors).",
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
  description: `Create a new slide deck or presentation — use when the user asks to make, build, generate, or start a new slide deck, slideshow, PowerPoint, or Keynote presentation.

Call this FIRST — once — to set up the theme, title, slide count, and layout pool. You pick:
  - title: presentation title (shown above the deck in the UI)
  - fontPreset: one of the font-preset keys
  - paletteName: the register name from the palette table (e.g. "warm editorial", "techno dark")
  - slideCount: how many slides the deck will have (commit to a concrete number)
  - layouts: the subset of compound "<composition>--<system>" layout names from the LAYOUT CATALOG you intend to use across the deck. Each subsequent add_slide call must pick from this list, and every name must share the same "--<system>" suffix.
  - accent: a 6-digit hex — the brand accent color for the deck. Set it to a hex that fits this deck's specific brand or topic. Skip ONLY for genuinely brand-ambiguous topics.

The result contains the full <Anuma.*> element recipes ONLY for the layouts you named in \`layouts\`, plus <Anuma.*> tag schemas, coordinate-system notes, and the palette hex values — everything you need for the add_slide calls that follow. Naming a tight subset keeps the context small and keeps the deck visually coherent.

After plan_deck, call add_slide ONCE PER SLIDE, in order, passing the slide as a <Anuma.Slide> JSX fragment, until you've appended slideCount slides. Each add_slide call reports how many slides remain, so you can track progress.

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
      slideCount: {
        type: "integer",
        minimum: 3,
        // Capped at 19 to match the default `maxToolRounds` of 20: a full
        // deck is 1 plan_deck + N add_slide calls, and the soft cap forces
        // `toolChoice: "none"` at iteration 20, which would silently
        // truncate decks of 20+ slides. Callers who raise `maxToolRounds`
        // can validate larger decks themselves.
        maximum: 19,
        description:
          "How many slides this deck will have. Pick a number between 3 and 19 based on the user's ask and the topic's depth. You will then call add_slide exactly this many times.",
      },
      layouts: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description:
          "Compound layout names (from the LAYOUT CATALOG) you plan to use across this deck. Pick a small, well-matched subset — typically 3–8 layouts for a deck of 10 slides. Each name must be of the form '<composition>--<system>' (e.g. 'cover-split-portrait--editorial-warm'); every entry must share the same '--<system>' suffix so the deck stays in one visual identity. Each add_slide call must use a layout from this list; picking a layout outside it is rejected.",
      },
      accent: {
        type: "string",
        pattern: "^#[0-9A-Fa-f]{6}$",
        description:
          "Brand accent color as a 6-digit hex. Almost every deck should set this. Pick a hex that fits this deck's specific brand or topic — what a designer would pick for THIS deck, not a generic industry default. Omit only when the topic is genuinely brand-ambiguous (internal status update, generic example).",
      },
    },
    required: ["title", "fontPreset", "paletteName", "slideCount", "layouts"],
  },
} as const;

export const ADD_SLIDE_SCHEMA = {
  name: "add_slide",
  description: `Append ONE slide to the deck as a <Anuma.Slide> JSX fragment. Call this once per slide after plan_deck, in order, until you've added slideCount slides. The deck re-renders inline after each add_slide so the viewer updates in-place.

The response reports: (a) how many slides remain to reach the planned slideCount, (b) which layouts you've used so far and how many times.

BATCHING: Prefer to emit ALL add_slide calls in a single assistant turn (as parallel tool calls) once plan_deck has returned. The deck plan already tells you the layouts and slideCount, so you can design every slide up-front and call add_slide N times in one turn. This cuts the number of LLM round-trips from N+1 to 2. Parallel calls don't see each other's per-call layout-usage feedback inside the same turn — that's fine because the layout subset is fixed at plan_deck time. Only fall back to serial calls if you genuinely need to react to each result before designing the next slide.

Example slideJsx:
  <Anuma.Slide id="cover">
    <Anuma.Text id="title" x={96} y={216} w={768} h={108} fontSize={58} fontRole="heading" fontWeight={700} color="textPrimary" align="center">Welcome</Anuma.Text>
  </Anuma.Slide>

Each composition recipe already defines its own chrome (header/footer slots) — copy the recipe verbatim and fill the role-tagged slots; do not invent a separate "header pattern".`,
  arguments: {
    type: "object",
    properties: {
      slideIndex: {
        type: "integer",
        description:
          "1-based position of this slide in the deck (1 = cover, slideCount = last). REQUIRED when emitting multiple add_slide calls in parallel in one turn (the recommended pattern) — without it the parallel calls land in non-deterministic order. Resubmitting with the same slideIndex overwrites the slide at that position; omit only for serial single-slide flows.",
        minimum: 1,
      },
      layout: {
        type: "string",
        description:
          "Name of the layout you're using for this slide — must be an exact compound '<composition>--<system>' name from the LAYOUT CATALOG (e.g. 'cover-split-portrait--editorial-warm'). Rejected with a helpful error if unknown.",
      },
      slideJsx: {
        type: "string",
        description:
          'JSX fragment whose root is <Anuma.Slide id="...">…</Anuma.Slide>. Numeric attributes use JSX expressions ({10}), string attrs are quoted.',
      },
    },
    required: ["layout", "slideJsx"],
  },
} as const;

// ---------------------------------------------------------------------------
// Storage helpers — slides.jsx lives in the shared AppFileStorage
// ---------------------------------------------------------------------------

/** Canonical storage path for the slide deck, relative to a conversation. */
export const SLIDES_FILE_PATH = "slides.jsx";

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export interface CreateSlideToolsOptions {
  /** Returns the current conversation ID (may be null before first message). */
  getConversationId: () => string | null;
  /** Storage backend for slides.jsx — only getFile/putFile are required. */
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

/**
 * Find a `<Anuma.Slide>` with matching id among the Deck's direct children.
 * Returns null if not found; returns null for anything that isn't a Slide.
 */
function findSlideById(deck: AnumaNode, id: string): AnumaNode | null {
  for (const child of deck.children) {
    if (typeof child === "string") continue;
    if (child.tag !== "Slide") continue;
    if (getId(child) === id) return child;
  }
  return null;
}

/**
 * Collect every `attrs.id` defined under `root`. The returned set is
 * mutable — callers append further ids to it as they merge new
 * subtrees in (see `dedupeIds`). When `excludeRoot` is provided, that
 * subtree (the node about to be replaced) is skipped, so its existing
 * ids don't trigger spurious renames in the replacement.
 */
function collectIds(root: AnumaNode, excludeRoot?: AnumaNode): Set<string> {
  const ids = new Set<string>();
  walk(root, (node) => {
    if (node === excludeRoot) return false;
    const id = getId(node);
    if (id !== undefined) ids.add(id);
  });
  return ids;
}

/**
 * Rewrite ids on `incoming` so that nothing collides with `taken` (or
 * with anything else seen earlier in `incoming` itself). Mutates
 * `incoming` in place and adds every committed id back to `taken`.
 *
 * Strategy: keep the LLM's friendly id when it's free, otherwise
 * suffix with `-2`, `-3`, ... until a free name is found. Returns the
 * list of `{ from, to }` rewrites for callers that want to surface a
 * note in the tool result.
 *
 * Why dedupe: LLMs reliably reuse ids like "title" or "subtitle"
 * across slides. Anything outside the tool — the editor sidebar, the
 * rendering pipeline, downstream consumers — that uses a tree-wide
 * `findById` would otherwise mis-route to the wrong element.
 */
function dedupeIds(taken: Set<string>, incoming: AnumaNode): Array<{ from: string; to: string }> {
  const renames: Array<{ from: string; to: string }> = [];
  walk(incoming, (node) => {
    const id = getId(node);
    if (id === undefined) return;
    if (!taken.has(id)) {
      taken.add(id);
      return;
    }
    let i = 2;
    let candidate = `${id}-${i}`;
    while (taken.has(candidate)) {
      i++;
      candidate = `${id}-${i}`;
    }
    node.attrs.id = candidate;
    taken.add(candidate);
    renames.push({ from: id, to: candidate });
  });
  return renames;
}

/**
 * Walk an Anuma subtree and reject any unknown `fontFamily` value.
 * Returns an error string the executor can return, or null if every
 * fontFamily is valid (or absent).
 *
 * Checks both top-level `fontFamily` attrs (in case of legacy/misplaced
 * values) and `style.fontFamily`, since typography now lives in style.
 */
function validateFontFamilies(root: AnumaNode): string | null {
  const bad: string[] = [];
  const seen = (v: unknown) => {
    if (typeof v === "string") {
      if (!isKnownFont(v)) bad.push(v);
    } else if (v !== undefined) {
      bad.push(JSON.stringify(v));
    }
  };
  walk(root, (node) => {
    seen(node.attrs.fontFamily);
    const style = node.attrs.style;
    if (style && typeof style === "object" && !Array.isArray(style)) {
      seen((style as Record<string, unknown>).fontFamily);
    }
  });
  if (bad.length === 0) return null;
  return `Unknown fontFamily value(s): ${bad.map((b) => JSON.stringify(b)).join(", ")}. Use an exact name from the FONT LIBRARY shown in the plan_deck result.`;
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
 * app-generation `create_file` tool — `plan_deck` initializes slides.jsx
 * and `add_slide` appends to it directly.
 */
/**
 * Return shape of {@link createSlideTools}: the tool array plus a
 * `clearConversation(id)` method to release per-conversation state. Call
 * the method when a conversation ends (session close, timeout, etc.) —
 * otherwise `deckStateByConv` and `writeLockByConv` grow unbounded over
 * the server process lifetime.
 *
 * The return is still array-iterable, so existing `tools: slideTools`
 * spreads keep working without destructuring.
 */
export type SlideToolSet = ToolConfig[] & {
  clearConversation: (conversationId: string) => void;
};

export function createSlideTools({
  getConversationId,
  storage,
  logError = () => {},
  displaySlides,
}: CreateSlideToolsOptions): SlideToolSet {
  function requireConversationId(): string {
    const id = getConversationId();
    if (!id) throw new Error("No active conversation");
    return id;
  }

  // Per-conversation deck state:
  //   - interactionId + title: carried forward so add_slide / patch_slides
  //     can update the same viewer in-place via replaces_interaction_id
  //     (otherwise a new viewer would be spawned for each incremental write).
  //   - slideCount: the number the model committed to at plan_deck time;
  //     each add_slide result reports remaining = slideCount - totalSlides
  //     so the model has a structural signal of when the deck is complete.
  //   - layoutUsage: counts per layout-name across add_slide calls, surfaced
  //     in every response so the model can diversify its layout choices
  //     without relying on prose enforcement alone.
  interface DeckState {
    interactionId: string;
    title: string;
    slideCount: number;
    /**
     * Layout names the model committed to in plan_deck. add_slide rejects
     * any layout outside this set — the plan_deck result only ships recipes
     * for these names, so using something else would leave the model
     * guessing at geometry.
     */
    plannedLayouts: string[];
    /** plan_deck's fontPreset — required to compute composition slot budgets. */
    fontPreset: string;
    /**
     * Optional accent color override (hex) the model passed at plan_deck.
     * Persisted so future recipes / patch flows can reapply it. Undefined
     * = use each system's curated default.
     */
    accent?: string;
    layoutUsage: Record<string, number>;
  }
  const deckStateByConv = new Map<string, DeckState>();

  // Per-conversation write lock. Serializes the read-modify-write sequence
  // inside add_slide so that if a model emits multiple add_slide tool calls
  // in parallel in a single turn, each one sees the result of the previous
  // rather than racing on slides.jsx. Chain via Promise so queued callers
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
        const slideCountRaw = args.slideCount;
        const slideCount =
          typeof slideCountRaw === "number" && Number.isInteger(slideCountRaw)
            ? slideCountRaw
            : NaN;

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
        if (!Number.isFinite(slideCount) || slideCount < 3 || slideCount > 19) {
          return {
            error: `slideCount must be an integer between 3 and 19 (got ${JSON.stringify(slideCountRaw)}).`,
          };
        }

        // Optional accent override — a single 6-digit hex string. The
        // dark-surface variant is auto-derived inside applyAccent().
        let accent: string | undefined;
        if (args.accent !== undefined && args.accent !== null && args.accent !== "") {
          if (typeof args.accent !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(args.accent)) {
            return {
              error: `accent must be a 6-digit hex color (e.g. '#16A34A'); got ${JSON.stringify(args.accent)}.`,
            };
          }
          accent = args.accent.toUpperCase();
        }

        // Validate and dedupe the layouts list. Each name must resolve in
        // the LAYOUT CATALOG — bad names are rejected as a batch with a
        // helpful hint. We only ship recipes for these layouts, and
        // add_slide later refuses to use anything outside this set.
        const layoutsRaw = args.layouts;
        if (!Array.isArray(layoutsRaw) || layoutsRaw.length === 0) {
          const sample = listCompositionLayoutNames().slice(0, 3);
          return {
            error: `layouts is required and must be a non-empty array of composition layout names (e.g. ${JSON.stringify(sample)}).`,
          };
        }
        const plannedLayouts: string[] = [];
        const seenLayouts = new Set<string>();
        const badLayouts: string[] = [];
        for (const raw of layoutsRaw) {
          if (typeof raw !== "string" || !raw) continue;
          if (seenLayouts.has(raw)) continue;
          seenLayouts.add(raw);
          if (!resolveCompositionLayout(raw)) {
            badLayouts.push(raw);
            continue;
          }
          plannedLayouts.push(raw);
        }
        if (badLayouts.length > 0) {
          return {
            error: `Unknown layout name(s) in layouts: ${badLayouts.map((n) => JSON.stringify(n)).join(", ")}. Use a compound composition--system name from the LAYOUT CATALOG (e.g. 'cover-split-portrait--editorial-warm'). Bare composition names without a system suffix are rejected.`,
          };
        }
        if (plannedLayouts.length === 0) {
          return {
            error: "layouts must contain at least one valid composition layout name (e.g. 'cover-split-portrait--editorial-warm').",
          };
        }

        // State-machine guard: plan_deck is only for initializing a fresh
        // deck. If a deck already exists in this conversation, refuse —
        // the caller should use read_slides + patch_slides to modify it,
        // or start a new conversation to regenerate. This prevents the
        // model from silently clobbering a working deck when it forgets
        // that one already exists (e.g., in long conversations where the
        // original plan_deck call has scrolled out of active context).
        const existing = await storage.getFile(conversationId, SLIDES_FILE_PATH);
        if (existing) {
          try {
            const existingDeck = parseJsx(existing.content);
            const slideCount = existingDeck.children.filter(
              (c) => typeof c !== "string" && c.tag === "Slide"
            ).length;
            if (slideCount > 0) {
              return {
                error: `Deck already exists with ${slideCount} slide(s). Use read_slides + patch_slides to modify it, or start a new conversation to regenerate. plan_deck is only for initializing a fresh deck.`,
              };
            }
          } catch {
            // slides.jsx is unreadable — treat as absent and allow init.
          }
        }

        // Initialize an empty deck with the chosen theme. The <Anuma.Deck>
        // root carries `fontPreset` + the nine palette colour tokens as
        // attrs — these are the theme, there's no nested theme object.
        // If the model passed an accent override, swap the palette's accent
        // token with it so palette-driven systems (editorial-warm) inherit
        // the override too — their roles resolve color from the deck's
        // `accent` attr at render time.
        const deck: AnumaNode = {
          tag: "Deck",
          attrs: {
            fontPreset,
            background: palette.colors.background,
            slideBg: palette.colors.slideBg,
            surfaceSecondary: palette.colors.surfaceSecondary,
            textPrimary: palette.colors.textPrimary,
            textSecondary: palette.colors.textSecondary,
            textMuted: palette.colors.textMuted,
            accent: accent ?? palette.colors.accent,
            card: palette.colors.card,
            border: palette.colors.border,
          },
          children: [],
        };
        await storage.putFile(conversationId, SLIDES_FILE_PATH, serializeJsx(deck));

        // Open a display interaction now so the viewer appears and add_slide
        // calls can update it in-place.
        const display = displaySlides ? await displaySlides({ title }) : null;
        const interactionId =
          display && typeof display === "object" && "interaction_id" in display
            ? (display as { interaction_id?: unknown }).interaction_id
            : undefined;
        deckStateByConv.set(conversationId, {
          interactionId: typeof interactionId === "string" ? interactionId : "",
          title,
          slideCount,
          plannedLayouts,
          fontPreset,
          accent,
          layoutUsage: {},
        });

        const content = `Deck initialized — theme applied, empty slides array ready.

Theme: ${palette.name} (fontPreset: ${fontPreset})
Palette colors (already applied to theme.colors):
${renderPaletteColors(
  accent
    ? { ...palette, colors: { ...palette.colors, accent } }
    : palette
)}
Planned slide count: ${slideCount} (call add_slide exactly ${slideCount} times).

COORDINATE SYSTEM — container-relative pixels on a 960×540 slide canvas.
- Child (x, y) is the pixel offset from the parent container's top-left.
- Standard padding: ≈58px horizontal, ≈49px vertical. Content band: x=58–902, y=49–491.
- fontSize is pixels: 43 ≈ large heading, 18 ≈ body, 13 ≈ mono eyebrow.
- Containers default to absolute positioning. Opt into flex with layout="row" | "column" on the container (see LAYOUT MODES in the system prompt).

ELEMENT TAGS — every slide child is one of these <Anuma.*> elements (numeric attrs use {…}, string attrs quoted):
${renderElementKinds()}

LAYOUT RECIPES — JSX recipes for the ${plannedLayouts.length} layout(s) you named in plan_deck. Each add_slide call must pick one of these; copy the element geometry and substitute your text:

${plannedLayouts
  .map((name) =>
    renderCompositionLayoutRecipe(
      name,
      FONT_PRESETS[fontPreset]!,
      accent ? { base: accent } : undefined
    )
  )
  .filter((r): r is string => r !== null)
  .join("\n\n")}

FONT LIBRARY — the theme already applies the fontPreset pairing (${fontPreset}) to every <Anuma.Text> element by default. Override per-element by setting fontFamily on <Anuma.Text> to any name from this library — reach for a display face on a hero title, or an accent script for a single signature word. Do NOT use accent fonts for body copy. Names validated on write; typos are rejected with a hint.

${renderFontLibrary()}

NOW call add_slide ${slideCount} times, one slide per call. Each add_slide takes { slideIndex: <1..${slideCount}>, layout: "<layout-name>", slideJsx: "<Anuma.Slide …>…</Anuma.Slide>" }. Pass the correct slideIndex on every call so the deck ends up in the order you intend — parallel tool calls otherwise land in non-deterministic order. The response reports how many slides remain and which layouts you've used so far — use that feedback to keep layouts varied across the deck.`;

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
        const layout = typeof args.layout === "string" ? args.layout : "";
        const slideJsx = typeof args.slideJsx === "string" ? args.slideJsx : "";
        const slideIndexRaw = args.slideIndex;
        const slideIndex =
          typeof slideIndexRaw === "number" && Number.isInteger(slideIndexRaw) && slideIndexRaw >= 1
            ? slideIndexRaw
            : null;

        if (!layout) {
          return { error: "layout is required (compound composition--system name from LAYOUT CATALOG)" };
        }
        if (!resolveCompositionLayout(layout)) {
          return {
            error: `Unknown layout '${layout}'. Use a compound composition--system name from the LAYOUT CATALOG (e.g. 'cover-split-portrait--editorial-warm'). Bare composition names without a system suffix are rejected.`,
          };
        }
        const priorState = deckStateByConv.get(conversationId);
        if (priorState && !priorState.plannedLayouts.includes(layout)) {
          return {
            error: `Layout '${layout}' is not in the plan_deck layouts list for this deck. Use one of: ${priorState.plannedLayouts.map((n) => `'${n}'`).join(", ")}. If you genuinely need a different layout, start a new deck and include it in plan_deck.`,
          };
        }
        if (!slideJsx) {
          return { error: "slideJsx is required and must be a <Anuma.Slide> JSX fragment" };
        }
        // Recipe image slots ship with src="REPLACE_WITH_IMAGE_OR_REMOVE"
        // (see designSystem.ts → IMAGE_PLACEHOLDER_SENTINEL). Reject any
        // slide that copies the sentinel verbatim — the model must
        // substitute a real image source or remove the <Anuma.Image>
        // element entirely.
        if (slideJsx.includes(IMAGE_PLACEHOLDER_SENTINEL)) {
          return {
            error: `slideJsx still contains the recipe placeholder "${IMAGE_PLACEHOLDER_SENTINEL}". Replace src with a real URL (attached:N reference or an AnumaImageMCP-generate_cloud_image URL if that tool is available) OR remove the <Anuma.Image> element entirely if you have no image for this slot.`,
          };
        }
        let slide: AnumaNode;
        try {
          slide = parseJsx(slideJsx);
        } catch (err) {
          const msg = err instanceof AnumaJsxError ? err.message : String(err);
          return { error: `Invalid slideJsx: ${msg}` };
        }
        if (slide.tag !== "Slide") {
          return {
            error: `Invalid slideJsx: root must be <Anuma.Slide>, got <Anuma.${slide.tag}>`,
          };
        }
        const fontError = validateFontFamilies(slide);
        if (fontError) return { error: fontError };

        // Slot-budget check: reject content that overflows the slot's char
        // budget so the model retries tighter copy instead of silently
        // clipping at render time (e.g. a single-line hero box filling
        // with a 2-line string and losing the second line under
        // overflow:hidden). The layout is guaranteed resolvable here —
        // validation rejected unknown names above.
        const compositionResolved = resolveCompositionLayout(layout)!;
        const presetName = deckStateByConv.get(requireConversationId())?.fontPreset ?? "default";
        const fontPreset = FONT_PRESETS[presetName] ?? FONT_PRESETS.default!;
        const slotIssues = validateSlotContent(
          compositionResolved.composition,
          compositionResolved.system,
          fontPreset,
          slide
        );
        if (slotIssues.length > 0) {
          const list = slotIssues
            .map((i) => `  - ${i.id} [${i.role}]: ${i.issue}\n    you wrote: ${JSON.stringify(i.text.trim())}`)
            .join("\n");
          return {
            error: `Content overflows the layout's slot budget — shorten the copy in these slots and resubmit add_slide for this slide:\n${list}\nSingle-line slots must fit on one line. Multi-line slots have a total-char ceiling (charsPerLine × maxLines).`,
          };
        }

        // Force the composition's expected slide background regardless of
        // whether the model copied it from the recipe. compositions with a
        // "dark" surface use text colors that read against a dark ground
        // (e.g. color="slideBg" for the cover hero) — if the slide ends
        // up on the deck's light slideBg those lines render invisible.
        const expectedBg = compositionSlideBackground(
          compositionResolved.composition,
          compositionResolved.system
        );
        if (expectedBg && typeof slide.attrs.background !== "string") {
          slide.attrs.background = expectedBg;
        }

        // Serialize the read-modify-write so parallel add_slide tool calls
        // in a single assistant turn don't race on slides.jsx.
        return await withWriteLock(conversationId, async () => {
          const file = await storage.getFile(conversationId, SLIDES_FILE_PATH);
          if (!file) {
            return { error: "No slides.jsx found. Call plan_deck first." };
          }
          const deck = parseJsx(file.content);
          // A retry for the same slideIndex must replace, not duplicate.
          if (slideIndex !== null) {
            const sameIdx = deck.children.findIndex(
              (c) =>
                typeof c !== "string" &&
                c.tag === "Slide" &&
                typeof c.attrs.slideIndex === "number" &&
                c.attrs.slideIndex === slideIndex
            );
            if (sameIdx >= 0) deck.children.splice(sameIdx, 1);
          }
          // Existing slide count after any retry-replacement removal.
          const existingSlideCount = deck.children.filter(
            (c) => typeof c !== "string" && c.tag === "Slide"
          ).length;
          // Auto-assign the next position when the model omits slideIndex
          // (serial flows that rely on append order). Explicit indices
          // win for parallel batches.
          const finalIndex = slideIndex ?? existingSlideCount + 1;
          slide.attrs.slideIndex = finalIndex;
          // Rewrite duplicate ids before merging so tree-wide id lookups
          // outside the tool (editor sidebar, renderer, etc.) stay safe.
          const renames = dedupeIds(collectIds(deck), slide);
          deck.children.push(slide);
          // Sort children by slideIndex so the on-disk order is always
          // the model's declared deck order, not the parallel-tool-call
          // arrival order. Slides without a slideIndex sort to the end.
          deck.children.sort((a, b) => {
            const ai =
              typeof a !== "string" && typeof a.attrs.slideIndex === "number"
                ? a.attrs.slideIndex
                : Number.POSITIVE_INFINITY;
            const bi =
              typeof b !== "string" && typeof b.attrs.slideIndex === "number"
                ? b.attrs.slideIndex
                : Number.POSITIVE_INFINITY;
            return ai - bi;
          });
          await storage.putFile(conversationId, SLIDES_FILE_PATH, serializeJsx(deck));

          // Update deck state: bump layout usage, compute remaining.
          const state = deckStateByConv.get(conversationId);
          if (state) {
            state.layoutUsage[layout] = (state.layoutUsage[layout] ?? 0) + 1;
          }
          const totalSlides = deck.children.filter(
            (c) => typeof c !== "string" && c.tag === "Slide"
          ).length;
          const planned = state?.slideCount;
          const remaining =
            typeof planned === "number" ? Math.max(0, planned - totalSlides) : undefined;

          // Update the display interaction in-place, reusing the id from
          // plan_deck / the previous add_slide. Pass the deck title too so
          // host hooks that display a header don't fall back to a generic
          // label on per-slide appends.
          const displayArgs: Record<string, unknown> = {
            ...(state?.title ? { title: state.title } : {}),
            ...(state?.interactionId ? { replaces_interaction_id: state.interactionId } : {}),
          };
          const display = displaySlides ? await displaySlides(displayArgs) : null;
          if (display && typeof display === "object" && "interaction_id" in display) {
            const newId = (display as { interaction_id?: unknown }).interaction_id;
            if (typeof newId === "string" && state) {
              state.interactionId = newId;
            }
          }

          // Build a short usage hint the model can act on without reading
          // the whole conversation back. While the deck is in progress,
          // also list which plan layouts haven't been used yet so the
          // model has a concrete target rather than just a count it can
          // ignore.
          const usage = state?.layoutUsage ?? {};
          const usageSummary = Object.entries(usage)
            .map(([name, count]) => `${name}×${count}`)
            .join(", ");
          const plannedLayouts = state?.plannedLayouts ?? [];
          const unused = plannedLayouts.filter((n) => !(n in usage));
          const varietyHint =
            unused.length > 0
              ? ` Unused from your plan: ${unused.join(", ")} — prefer one of these for the next slide.`
              : "";

          const baseMessage =
            typeof remaining === "number" && remaining > 0
              ? `Appended slide ${totalSlides} (${layout}). ${remaining} more to go (layouts so far: ${usageSummary}).${varietyHint}`
              : typeof remaining === "number" && remaining === 0
                ? `Appended slide ${totalSlides} (${layout}). Deck is complete (layouts used: ${usageSummary}).`
                : `Appended slide ${totalSlides} (${layout}).`;
          const renameNote =
            renames.length > 0
              ? ` Renamed duplicate ids: ${renames.map((r) => `${r.from}→${r.to}`).join(", ")}.`
              : "";
          return {
            success: true,
            slideIndex: totalSlides - 1,
            totalSlides,
            remaining,
            layoutUsage: usage,
            ...(renames.length > 0 ? { renamedIds: renames } : {}),
            message: baseMessage + renameNote,
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
        const file = await storage.getFile(conversationId, SLIDES_FILE_PATH);
        if (!file) return { error: "No slides.jsx found." };
        // Stored content is already the canonical <Anuma.Deck> JSX — return verbatim.
        return { content: file.content };
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
          jsx?: string;
          afterSlideId?: string;
          afterElementId?: string;
          set?: Record<string, unknown>;
        }>;

        if (!Array.isArray(operations) || operations.length === 0) {
          return { error: "operations array is required and must not be empty" };
        }

        // Serialize the read-modify-write under the same per-conversation
        // lock that add_slide uses, so a concurrent patch + add_slide pair
        // can't clobber each other's writes to slides.jsx.
        const locked = await withWriteLock(conversationId, async () => {
          const file = await storage.getFile(conversationId, SLIDES_FILE_PATH);
          if (!file) return { error: "No slides.jsx found. Call plan_deck first." } as const;

          const deck = parseJsx(file.content);
          const results: string[] = [];

          for (const op of operations) {
            const slideNode = op.slideId !== undefined ? findSlideById(deck, op.slideId) : null;

            switch (op.action) {
              case "replace_element": {
                if (!slideNode) {
                  results.push(`replace_element: slide ${op.slideId} not found`);
                  break;
                }
                if (typeof op.elementId !== "string" || !op.elementId) {
                  results.push("replace_element: elementId is required");
                  break;
                }
                if (typeof op.jsx !== "string" || !op.jsx) {
                  results.push("replace_element: missing jsx");
                  break;
                }
                let next: AnumaNode;
                try {
                  next = parseJsx(op.jsx);
                } catch (err) {
                  const msg = err instanceof AnumaJsxError ? err.message : String(err);
                  results.push(`replace_element: invalid jsx: ${msg}`);
                  break;
                }
                if (next.tag === "Deck" || next.tag === "Slide") {
                  results.push(
                    `replace_element: jsx must be a content element (got <Anuma.${next.tag}>)`
                  );
                  break;
                }
                const fontErr = validateFontFamilies(next);
                if (fontErr) {
                  results.push(`replace_element: ${fontErr}`);
                  break;
                }
                // Rewrite duplicate ids in the replacement subtree, ignoring
                // the element it's about to replace (so the simplest
                // case — keeping the same id — doesn't trigger a rename).
                const oldNode = (() => {
                  let found: AnumaNode | null = null;
                  walk(slideNode, (n) => {
                    if (getId(n) === op.elementId) {
                      found = n;
                      return false;
                    }
                  });
                  return found;
                })();
                const renames = dedupeIds(collectIds(deck, oldNode ?? undefined), next);
                if (!replaceById(slideNode, op.elementId, next)) {
                  results.push(`replace_element: element ${op.elementId} not found`);
                  break;
                }
                results.push(
                  renames.length > 0
                    ? `replaced ${op.slideId}/${op.elementId} (renamed: ${renames.map((r) => `${r.from}→${r.to}`).join(", ")})`
                    : `replaced ${op.slideId}/${op.elementId}`
                );
                break;
              }
              case "insert_element": {
                if (!slideNode) {
                  results.push(`insert_element: slide ${op.slideId} not found`);
                  break;
                }
                if (typeof op.jsx !== "string" || !op.jsx) {
                  results.push("insert_element: missing jsx");
                  break;
                }
                let next: AnumaNode;
                try {
                  next = parseJsx(op.jsx);
                } catch (err) {
                  const msg = err instanceof AnumaJsxError ? err.message : String(err);
                  results.push(`insert_element: invalid jsx: ${msg}`);
                  break;
                }
                if (next.tag === "Deck" || next.tag === "Slide") {
                  results.push(
                    `insert_element: jsx must be a content element (got <Anuma.${next.tag}>)`
                  );
                  break;
                }
                const fontErr = validateFontFamilies(next);
                if (fontErr) {
                  results.push(`insert_element: ${fontErr}`);
                  break;
                }
                const renames = dedupeIds(collectIds(deck), next);
                insertChild(slideNode, next, op.afterElementId);
                const newId = getId(next) ?? "<no-id>";
                results.push(
                  renames.length > 0
                    ? `inserted ${newId} into ${op.slideId} (renamed: ${renames.map((r) => `${r.from}→${r.to}`).join(", ")})`
                    : `inserted ${newId} into ${op.slideId}`
                );
                break;
              }
              case "remove_element": {
                if (!slideNode) {
                  results.push(`remove_element: slide ${op.slideId} not found`);
                  break;
                }
                if (typeof op.elementId !== "string" || !op.elementId) {
                  results.push("remove_element: elementId is required");
                  break;
                }
                if (removeById(slideNode, op.elementId)) {
                  results.push(`removed ${op.elementId}`);
                } else {
                  results.push(`remove_element: ${op.elementId} not found`);
                }
                break;
              }
              case "replace_slide": {
                if (!slideNode) {
                  results.push(`replace_slide: slide ${op.slideId} not found`);
                  break;
                }
                if (typeof op.jsx !== "string" || !op.jsx) {
                  results.push("replace_slide: missing jsx");
                  break;
                }
                let next: AnumaNode;
                try {
                  next = parseJsx(op.jsx);
                } catch (err) {
                  const msg = err instanceof AnumaJsxError ? err.message : String(err);
                  results.push(`replace_slide: invalid jsx: ${msg}`);
                  break;
                }
                if (next.tag !== "Slide") {
                  results.push(
                    `replace_slide: root must be <Anuma.Slide>, got <Anuma.${next.tag}>`
                  );
                  break;
                }
                const fontErr = validateFontFamilies(next);
                if (fontErr) {
                  results.push(`replace_slide: ${fontErr}`);
                  break;
                }
                if (!op.slideId) {
                  results.push("replace_slide: slideId is required");
                  break;
                }
                const oldSlide = findSlideById(deck, op.slideId);
                if (!oldSlide) {
                  results.push(`replace_slide: slide ${op.slideId} not found`);
                  break;
                }
                const renames = dedupeIds(collectIds(deck, oldSlide), next);
                if (!replaceById(deck, op.slideId, next)) {
                  results.push(`replace_slide: slide ${op.slideId} not found`);
                  break;
                }
                results.push(
                  renames.length > 0
                    ? `replaced slide ${op.slideId} (renamed: ${renames.map((r) => `${r.from}→${r.to}`).join(", ")})`
                    : `replaced slide ${op.slideId}`
                );
                break;
              }
              case "insert_slide": {
                if (typeof op.jsx !== "string" || !op.jsx) {
                  results.push("insert_slide: missing jsx");
                  break;
                }
                let next: AnumaNode;
                try {
                  next = parseJsx(op.jsx);
                } catch (err) {
                  const msg = err instanceof AnumaJsxError ? err.message : String(err);
                  results.push(`insert_slide: invalid jsx: ${msg}`);
                  break;
                }
                if (next.tag !== "Slide") {
                  results.push(`insert_slide: root must be <Anuma.Slide>, got <Anuma.${next.tag}>`);
                  break;
                }
                const fontErr = validateFontFamilies(next);
                if (fontErr) {
                  results.push(`insert_slide: ${fontErr}`);
                  break;
                }
                const renames = dedupeIds(collectIds(deck), next);
                insertChild(deck, next, op.afterSlideId);
                const newId = getId(next) ?? "<no-id>";
                results.push(
                  renames.length > 0
                    ? `inserted slide ${newId} (renamed: ${renames.map((r) => `${r.from}→${r.to}`).join(", ")})`
                    : `inserted slide ${newId}`
                );
                break;
              }
              case "remove_slide": {
                if (!op.slideId) {
                  results.push("remove_slide: missing slideId");
                  break;
                }
                if (removeById(deck, op.slideId)) {
                  results.push(`removed slide ${op.slideId}`);
                } else {
                  results.push(`remove_slide: ${op.slideId} not found`);
                }
                break;
              }
              case "update_theme": {
                if (op.set) {
                  const nextFontPreset = op.set.fontPreset;
                  if (
                    nextFontPreset !== undefined &&
                    (typeof nextFontPreset !== "string" || !FONT_PRESETS[nextFontPreset])
                  ) {
                    results.push(
                      `update_theme: unknown fontPreset ${JSON.stringify(nextFontPreset)}. Valid: ${Object.keys(FONT_PRESETS).join(", ")}`
                    );
                    break;
                  }
                  // Theme is now flat on the <Anuma.Deck> root. Accept either
                  // a flat patch ({ fontPreset, accent }) or a nested one
                  // ({ colors: { accent } }) — the latter is kept as a
                  // backwards-compat convenience for the old schema.
                  const { colors: nestedColors, ...flatPatch } = op.set as {
                    colors?: Record<string, unknown>;
                    [key: string]: unknown;
                  };
                  updateAttrs(deck, flatPatch);
                  if (nestedColors && typeof nestedColors === "object") {
                    updateAttrs(deck, nestedColors);
                  }
                }
                results.push("updated theme");
                break;
              }
              default:
                results.push(`unknown action: ${op.action}`);
            }
          }

          await storage.putFile(conversationId, SLIDES_FILE_PATH, serializeJsx(deck));
          return { results };
        });

        if ("error" in locked) return { error: locked.error };
        const { results } = locked;

        // Prefer the model-supplied replaces_interaction_id, but fall back to
        // the closure-tracked id from plan_deck / add_slide so patch_slides
        // updates the same viewer even if the model forgets to thread the id.
        const state = deckStateByConv.get(conversationId);
        const replacesId =
          typeof args.replaces_interaction_id === "string"
            ? args.replaces_interaction_id
            : state?.interactionId || undefined;
        const display = displaySlides
          ? await displaySlides({
              ...(state?.title ? { title: state.title } : {}),
              ...(replacesId ? { replaces_interaction_id: replacesId } : {}),
            })
          : null;
        if (display && typeof display === "object" && "interaction_id" in display) {
          const newId = (display as { interaction_id?: unknown }).interaction_id;
          if (typeof newId === "string" && state) {
            state.interactionId = newId;
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

  const tools = [planDeckTool, addSlideTool, readSlidesTool, patchSlidesTool] as SlideToolSet;
  tools.clearConversation = (conversationId: string) => {
    deckStateByConv.delete(conversationId);
    writeLockByConv.delete(conversationId);
  };
  return tools;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * Build the slide mode system prompt — slim initialize + per-slide flow.
 *
 * Instructs the LLM to call plan_deck once (picks title + palette +
 * fontPreset, initializes an empty slides.jsx, returns the full layout
 * recipes + element-type schemas + palette hex values),
 * then call add_slide once per slide to append. Per-slide rounds keep
 * each tool-call stream small so slow / reasoning-heavy models can finish
 * within portal per-provider timeout ceilings.
 */
export function buildSlideSystemPrompt(): string {
  const fontTable = Object.entries(FONT_PRESETS)
    .map(([name, p]) => `  ${name}: heading="${p.heading}", body="${p.body}"`)
    .join("\n");

  return `You are a presentation design assistant. You produce polished slide decks as React-compatible JSX with positioned <Anuma.*> elements.

WORKFLOW (initialize then add all slides at once):
1. INITIALIZE — call plan_deck ONCE with { title, fontPreset, paletteName, slideCount, layouts }. Commit to an integer slideCount (3–19) and a small subset of layouts from the catalog below (typically 3–8) that you will use across the deck. plan_deck's result contains the JSX recipes for ONLY the layouts you named, plus element-tag schemas, coordinate-system notes, and palette hex values.
2. APPEND — in your next assistant turn, emit all N add_slide calls in parallel (one per slide) with { slideIndex: <1-based position>, layout: "<name>", slideJsx: "<Anuma.Slide id=\\"...\\">…children…</Anuma.Slide>" }. Pass slideIndex = 1 for the cover, 2 for the second slide, and so on through slideCount. WITHOUT slideIndex the parallel calls land in the deck in non-deterministic order. Design every slide up-front from the plan_deck recipes and dispatch them together — this cuts round-trips from N+1 to 2. layout MUST be one of the names you passed to plan_deck; using anything else is rejected.

For edits to an existing deck: read_slides (returns the deck as <Anuma.Deck> JSX) → patch_slides (replace_element / insert_element / remove_element / replace_slide / insert_slide / remove_slide / update_theme). No plan_deck needed for edits.

RESPONSE STYLE — after the tool calls complete, keep your closing message to ONE short sentence ("Done." or "Renamed across 5 slides." is ideal). The deck re-renders inline so the user already sees the changes; do NOT recap which slides changed, list operations, or summarize the deck contents in prose. Long post-tool summaries are the single biggest source of latency in this flow — keep them out.

JSX VOCABULARY — two families of tags, mix freely:

<Anuma.*> primitives for design-tool concepts that aren't HTML:
  - <Anuma.Deck> / <Anuma.Slide> / <Anuma.Screen> — containers with canvas semantics.
  - <Anuma.Rect> / <Anuma.Circle> / <Anuma.Line> — SVG shape abstractions (fill / stroke / strokeWidth / cornerRadius as attrs, not style).

Plain HTML for everything else — standard structural, text, list, form, table, media, and SVG tags (h1–h6, p, div, span, ul/ol/li, table/tr/td, button, input, img, svg, path, …). Forbidden: script, iframe, link, style, meta, object, embed, head, body, noscript, plus all event-handler attrs (onClick, onChange, etc.).

WHEN TO REACH FOR EACH:
  - Use <Anuma.Slide> / <Anuma.Screen> as the root for each slide / app screen.
  - Use <Anuma.Rect> / <Anuma.Circle> / <Anuma.Line> for decorative shapes.
  - Use plain HTML for every piece of content: headings, paragraphs, buttons, inputs, images, lists, tables.
  - For flex layout, use <Anuma.Group layout="row" gap={16} padding={24}>…</Anuma.Group> (see LAYOUT MODES below).

ATTRIBUTES:
  - Numeric attrs use JSX expressions: x={96}. String attrs are quoted.
  - Geometry for absolute-positioned children of <Anuma.Slide>: x={…} y={…} w={…} h={…} rotation={…} (pixels; renderer converts to position:absolute). Works on any tag.
  - Appearance lives in style={{}} — CSS property names in camelCase. Example:
      <h1 x={58} y={162} w={844} h={54} style={{ fontSize: 43, fontWeight: 700, color: "textPrimary", textAlign: "center" }}>Welcome</h1>
    Color strings inside style accept theme tokens (textPrimary, accent, slideBg, textMuted, border, card, surfaceSecondary) OR hex/rgb literals.
  - Shape fill/stroke (on <Anuma.Rect> / <Anuma.Circle> / <Anuma.Line>) ALSO accept theme tokens: fill="accent" or fill="#10b981".

TEXT BUDGETS — each layout recipe reports a "Text budgets" line listing the max-character estimate per text slot, derived from the slot's box width × height at the chosen font size. Treat the numbers as a soft target: write copy that fits well under the limit. Overflowing text gets line-clamped with an ellipsis at render time, so going over the budget loses information. When in doubt, write tighter. Slot ids in the budget line match the recipe's <Anuma.Text id="..."> attributes.

LAYOUT MODES — containers (Deck, Slide, Group) default to absolute positioning. To flow children instead, opt in on the container:
- <Anuma.Group layout="row" gap={16} padding={24} justify="start" align="center">…</Anuma.Group>
- layout: "absolute" (default) | "row" | "column". gap: spacing between children in px. padding: inset in px. justify: "start" | "center" | "end" | "space-between". align: "start" | "center" | "end" | "stretch".
- Inside a flex container, skip x and y on children; they flow. You may still set w/h, or use grow={1} / shrink={1} to stretch.
- Most slides use the default absolute positioning. Reach for flex when you want evenly-spaced cards, a row of stats, or a stack that should self-size.

Never output code as text. Always use tools. Keep text responses to one or two sentences.

LAYOUT CATALOG — every layout is formed by combining a composition (the content shape) with a design system (the visual identity). The layout name you pass to plan_deck and add_slide MUST be the compound form "<composition>--<system>". Bare composition names like "cover-split-portrait" without a system suffix are REJECTED. Across the whole deck pick ONE design system and apply it to every composition (don't mix "--${listDesignSystemNames().join('" and "--')}" in the same deck).

Available compositions (pick by content shape):
${listCompositionDescriptions()
  .map((c) => `- ${c.name} — ${c.description}`)
  .join("\n")}

Available design systems (pick ONE for the whole deck — match the deck's register / industry to a system's use case):
${renderDesignSystemCatalog()}

Form layout names by joining a composition with a design system using "--" (e.g. "cover-split-portrait--editorial-warm"). plan_deck and add_slide reject unknown combinations.

The "--<system>" suffix is the design-system name from the list above (${listDesignSystemNames().join(", ")}) — NOT a palette name. Palette names (from CHOOSING A PALETTE below) go in the separate \`paletteName\` arg; they are never valid as layout suffixes even when they look similar (e.g. the palette "humanist cream" is not a system; the closest system is "editorial-warm").

Recipes are fully styled — copy verbatim and substitute slot text only.

Layout variety: add_slide reports usage counts after each call. Prefer layouts you haven't used yet; use a layout more than twice only for structural repetition like chapter-break slides.

FONT PRESETS:
${fontTable}
Tech → bold/techno. Business → geometric/clean. Culture → editorial/humanist. Premium → elegant.

CHOOSING A PALETTE — don't default to dark grey + orange. Pick the register that matches the topic; plan_deck will inject its hex values for you. Don't invent new palettes unless the topic really demands it.

${renderPaletteNames()}

CHOOSING AN ACCENT (plan_deck.accent) — set \`accent\` to a 6-digit hex that fits the deck's specific brand or topic. Pick the color a designer would pick for THIS deck, not a generic industry default. Omit only when the topic is genuinely brand-ambiguous (e.g. an internal status update).

IMAGES:
- Allowed image sources: "attached:N" strings (user-attached images) OR URLs from a tool that generates real images (e.g. AnumaImageMCP-generate_cloud_image if available in your tool list). NEVER use web-search URLs, invented URLs, or placeholder hosts like placehold.co.
- Most decks should be text-only. If you have no real image source for a slot — no attached images AND no image-generation tool in your tool list — omit the <Anuma.Image> element entirely. Layout recipes ship images with src="REPLACE_WITH_IMAGE_OR_REMOVE"; add_slide rejects any slide that still contains that sentinel.
- With images: generate them FIRST (1–2 max), then call plan_deck and add_slide — the deck renders incrementally as slides are appended.

ICONS: Material Symbols Rounded — bolt, lock, search, favorite, star, check_circle, trending_up, rocket_launch, groups, code, brush, settings, etc.

COLOR TOKENS: textPrimary, textSecondary, textMuted, accent, card, border, background, slideBg`;
}
