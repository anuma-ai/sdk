/**
 * Tool-selection vocabulary — the neutral, product-agnostic types that let the
 * SDK own the "which tools this turn" orchestration both `apps/web` and
 * `apps/mobile` previously hand-duplicated (see issue #702).
 *
 * The split of ownership is deliberate:
 *
 * - The SDK owns the neutral {@link CreationIntent}→client-factory mapping
 *   ({@link CREATION_INTENT_CLIENT_FACTORIES}) and the send-policy rules.
 * - Each app owns its UI→{@link ToolIntentDescriptor} mapper and injects a
 *   {@link ServerToolCatalog} (built from its own static server-tool lists) and
 *   {@link ../assembleClientTools.ToolSelectionAdapters | adapters}. The SDK
 *   never imports the app's tool lists — the dependency direction stays
 *   app→SDK.
 *
 * This module has no runtime dependency on React, the DOM, WatermelonDB, or the
 * generated HTTP client, so it is safe to import from the node/RN-safe
 * `@anuma/sdk/tools/selection` subpath.
 */

import type { ServerToolsFilterFunction } from "../serverTools";

/**
 * Which orchestration path a turn runs through.
 *
 * - `chat` — the ordinary single-model chat turn (per-mode client + server
 *   tools, send-policy overrides).
 * - `council` — the multi-model comparison path; each worker sees the full
 *   semantic server-tool filter and (optionally) its own per-worker memory
 *   tools, and no per-mode client toolkit.
 * - `aggregation` — the council "unify" worker; like `council` but must never
 *   persist memories (no `memory_vault_save`).
 */
export type ToolLane = "chat" | "council" | "aggregation";

/**
 * The neutral creation intent for a chat turn. This is the union of web's
 * `(chatMode, activeTool)` triple and mobile's `ChatMode`, normalized so a
 * single resolver reproduces both.
 *
 * `music` / `sfx` scope a coerced turn to a single audio generator; `audio` is
 * the free-choice bundle (music + sfx). Apps that expose only a combined audio
 * mode use `audio`; the scoped keys exist so a `tool_choice: "required"` turn
 * cannot call the wrong generator.
 */
export type CreationIntent =
  | "plain"
  | "image"
  | "audio"
  | "music"
  | "sfx"
  | "video"
  | "remove-image-bg"
  | "app"
  | "slides"
  | "document"
  | "web-search"
  | "deep-research";

/**
 * A client-tool factory the SDK (or the host, for `saved`/`background`/
 * `schedule`) can instantiate. Presence of the matching adapter in
 * {@link ../assembleClientTools.ToolSelectionAdapters} GATES the factory — an
 * absent adapter yields zero tools, which is what lets one unified plan produce
 * web's full toolkit and mobile's subset automatically.
 */
export type ClientFactoryKey =
  | "memory"
  | "connectors"
  | "slides"
  | "app"
  | "document"
  | "ui"
  | "saved"
  | "background"
  | "schedule";

/**
 * How the assembled client tools are trimmed for the turn.
 *
 * - `auto` — the SDK semantic filter (`autoFilterClientTools`): send only the
 *   tools relevant to the prompt (plus always-on memory + sticky sets).
 * - `include-all` — send every assembled tool (builder modes: slides/app).
 * - `slide-editor` — keep only the slide-editing tools (the fullscreen-editor
 *   overlay); everything else is dropped even off-topic.
 */
export type ClientToolsFilterMode = "auto" | "include-all" | "slide-editor";

/** A custom client-tools filter: given the assembled tools, return the subset to send. */
export type ClientToolsFilterFn<TTool = unknown> = (tools: TTool[]) => TTool[] | Promise<TTool[]>;

/**
 * App-facing thinking hint. There is intentionally no `ThinkingMode` type in
 * the SDK core — each app translates this hint into its provider reasoning
 * config (e.g. web's `getReasoningConfigForModel`). The SDK only carries the
 * neutral hint so both apps agree on when a mode is "fast" vs "extended".
 */
export type ThinkingModeHint = "fast" | "thinking" | "extended";

/** Resolved tool-choice coercion for the turn. */
export type ToolChoice = "auto" | "required";

/** A server-tools filter: a static allow-list of names, or a semantic filter fn. */
export type ServerToolsFilter = string[] | ServerToolsFilterFunction;

/** Post-resolution client-tool mutations, applied by the host at send time. */
export type PostFilterKey =
  /** Strip `memory_vault_save` because the turn coerces a single tool (`tool_choice: "required"`). */
  | "strip-memory-save-when-coerced"
  /** Web: strip `memory_vault_save` on a pure retrieval-intent prompt. */
  | "strip-memory-save-on-retrieval-intent"
  /** Web: strip ALL server tools on a save-intent prompt (avoid a search loop before saving). */
  | "strip-server-tools-on-save-intent";

/**
 * The neutral description of a turn a host hands to {@link ../plan.resolvePlan}.
 * Each app writes a small UI→descriptor mapper; the resolver is otherwise
 * identical across apps.
 */
export interface ToolIntentDescriptor {
  /** Which orchestration path (chat / council / aggregation). */
  lane: ToolLane;
  /** The creation intent for the turn. Ignored for council/aggregation lanes. */
  creation: CreationIntent;
  /** Sticky tool-set names carried from conversation history (see `deriveActiveToolSets`). */
  activeToolSets?: string[];
  /** Attachments present on this turn — drives attachment-aware server-tool filters. */
  attachments?: { hasImages: boolean; hasVideos: boolean };
  /** The fullscreen editor open behind an ordinary chat turn, if any. */
  editorPinned?: "slides" | null;
  /** Message-aware escalation: the prompt reads as "make me a deck". */
  slideDeckIntent?: boolean;
  /**
   * Message-aware signal that the prompt reads as an image edit. When true it
   * SUPPRESSES slide-deck escalation (`slideDeckIntent`) in `resolvePlan` — an
   * image-edit turn must not be re-routed into the slide builder. Mirrors web's
   * `!imageEditActive` guard on slide-deck intent.
   */
  imageEditIntent?: boolean;
}

/**
 * Context passed to a catalog entry's server-tools factory form so it can vary
 * by attachments (e.g. drop background-removal when only a video is attached).
 */
export interface ServerToolsFilterContext {
  attachments?: { hasImages: boolean; hasVideos: boolean };
}

/**
 * One creation intent's server-tool policy plus its send-policy defaults,
 * supplied by the app.
 *
 * Provide EITHER a static `serverTools` value (an allow-list or a semantic
 * filter function) OR the attachment-aware `resolveServerTools` factory — the
 * latter takes precedence and is what the plain-chat entry uses (it binds a
 * logger and drops background-removal on a video-only attachment, which a
 * static value cannot express). The two are separate fields, not a union,
 * because a semantic filter is itself a function and would be indistinguishable
 * from a `(ctx) => filter` factory by shape alone.
 */
export interface ServerToolCatalogEntry {
  /** The server tools for this intent — a static allow-list or a semantic filter function. */
  serverTools?: ServerToolsFilter;
  /**
   * Attachment-aware form: produces the server tools for the turn from its
   * context. Takes precedence over `serverTools` when present.
   */
  resolveServerTools?: (ctx: ServerToolsFilterContext) => ServerToolsFilter;
  /** Override the default client-tools filter for this intent. */
  clientToolsFilter?: ClientToolsFilterMode | ClientToolsFilterFn;
  /** Explicit tool-choice; omit to let the shape of `serverTools` decide (see `resolveToolChoice`). */
  toolChoice?: ToolChoice;
  /** Per-intent max tool rounds (web uses a flat 35; mobile varies by mode). */
  maxToolRounds?: number;
  /** Per-intent thinking hint (e.g. slides→fast, deep-research→extended). */
  thinkingMode?: ThinkingModeHint;
  /** An authoritative system prompt for this intent (e.g. the slide/deep-research prompt). */
  systemPrompt?: string;
  /** Server tools that must always be present regardless of filtering. */
  forcedServerTools?: string[];
}

/**
 * The app-supplied catalog: a per-intent (and per-lane, for council) map of
 * {@link ServerToolCatalogEntry}. Built by each app from its own static
 * server-tool lists via a `buildServerToolCatalog()` helper and injected into
 * `resolvePlan(descriptor, { catalog })`. The SDK stays catalog-agnostic — this
 * is the seam that keeps the SDK from ever importing the app's tool lists.
 *
 * Named `ServerToolCatalog` (not `ToolCatalog`) to stay distinct from the SDK's
 * existing `TOOL_CATALOG` (a connector→label map for the denied-tools rider).
 */
export type ServerToolCatalog = Partial<Record<CreationIntent | ToolLane, ServerToolCatalogEntry>>;

/**
 * The fully-resolved plan for a turn: what `resolvePlan` produces and
 * `assembleClientTools` + the host's send layer consume.
 */
export interface ToolPlanSpec {
  /** Which client-tool factories to instantiate (capability-gated at assembly). */
  clientFactories: ClientFactoryKey[];
  /** How to trim the assembled client tools. */
  clientToolsFilter: ClientToolsFilterMode | ClientToolsFilterFn;
  /** The server-tools filter for the turn (resolved value, factory already applied). */
  serverTools: ServerToolsFilter;
  /** Server tools that must always be present. */
  forcedServerTools?: string[];
  /** Sticky tool-set names to force-activate in the semantic client filter. */
  activeToolSets: string[];
  /** The resolved tool-choice coercion. */
  toolChoice: ToolChoice;
  /** Max tool rounds (undefined → the host/SDK default). */
  maxToolRounds?: number;
  /** Thinking hint (undefined → the host default). */
  thinkingMode?: ThinkingModeHint;
  /** Authoritative system-prompt riders for the turn (tool-set personas ride in separately). */
  systemPromptRiders: string[];
  /** Client-tool mutations the host applies at send time. */
  postFilters: PostFilterKey[];
}

/**
 * Full generative client toolkit — the unified plain-chat / creation-mode
 * factory set. Web registers all of these unconditionally today; mobile
 * registers only the subset whose adapters it wires. Under capability-gated
 * assembly the SAME list yields web's superset and mobile's subset, so "make me
 * a deck" works from plain chat on whichever platform wires the slides adapter.
 */
export const FULL_GENERATIVE_CLIENT_FACTORIES: readonly ClientFactoryKey[] = [
  "memory",
  "connectors",
  "slides",
  "app",
  "document",
  "ui",
  "saved",
  "background",
  "schedule",
];

/**
 * The neutral {@link CreationIntent}→{@link ClientFactoryKey}[] mapping the SDK
 * owns. Creation modes (image/audio/video/…) share the full generative set —
 * the server-tool coercion + semantic filter do the narrowing, exactly as web's
 * fall-through does today. Builder modes (`app`, `slides`) are deliberately
 * restrictive.
 */
export const CREATION_INTENT_CLIENT_FACTORIES: Record<CreationIntent, readonly ClientFactoryKey[]> =
  {
    plain: FULL_GENERATIVE_CLIENT_FACTORIES,
    image: FULL_GENERATIVE_CLIENT_FACTORIES,
    audio: FULL_GENERATIVE_CLIENT_FACTORIES,
    music: FULL_GENERATIVE_CLIENT_FACTORIES,
    sfx: FULL_GENERATIVE_CLIENT_FACTORIES,
    video: FULL_GENERATIVE_CLIENT_FACTORIES,
    "remove-image-bg": FULL_GENERATIVE_CLIENT_FACTORIES,
    document: FULL_GENERATIVE_CLIENT_FACTORIES,
    "web-search": FULL_GENERATIVE_CLIENT_FACTORIES,
    "deep-research": FULL_GENERATIVE_CLIENT_FACTORIES,
    // Builder modes: restrict to their own toolkit; a `saved` toolkit rides
    // along on app builds (parity with web's app branch).
    app: ["app", "saved"],
    slides: ["slides"],
  };

/**
 * Default client-tools filter per intent. Generative modes use the semantic
 * filter; builder modes send their full toolkit (`include-all`).
 */
export const CREATION_INTENT_CLIENT_FILTER: Record<CreationIntent, ClientToolsFilterMode> = {
  plain: "auto",
  image: "auto",
  audio: "auto",
  music: "auto",
  sfx: "auto",
  video: "auto",
  "remove-image-bg": "auto",
  document: "auto",
  "web-search": "auto",
  "deep-research": "auto",
  app: "include-all",
  slides: "include-all",
};

/**
 * Built-in tool-set names (mirrors `BUILT_IN_TOOL_SETS[].name`). The generative
 * toolkits that a creation intent should force-activate as sticky sets — so a
 * builder mode's persona/toolkit rides in, and a follow-up stays in that lane.
 */
export const CREATION_INTENT_TOOL_SET: Partial<Record<CreationIntent, string>> = {
  app: "app-generation",
  slides: "slides",
  document: "documents",
};
