/**
 * `assembleClientTools` — capability-gated client-tool assembly (issue #702,
 * Phase 3). Given a resolved plan's `clientFactories` and a set of adapters, it
 * instantiates only the factories whose adapter is present and concatenates
 * them in a canonical order.
 *
 * The presence of an adapter GATES its factory — the generalization of
 * `createDocumentTools` returning `[]` when `displayDocument` is absent
 * (src/tools/document/index.ts). This is what lets ONE unified plan produce
 * web's full toolkit and mobile's subset automatically: web wires every
 * builder, mobile wires only the ones its RN surface supports, and the absent
 * ones contribute nothing.
 *
 * The SDK deliberately owns the GATING, ORDER, and filter application — not the
 * per-factory wiring. Each app's factory instantiation (slide auto-display,
 * app-lineage tracking, RN-vs-web storage, logging instrumentation) is
 * genuinely app-specific and stays app-side, expressed as a builder here.
 *
 * Pure and node/RN-safe.
 */

import type { ToolConfig } from "../../chat/useChat/types";
import { getToolName } from "../clientToolSelection";
import type {
  ClientFactoryKey,
  ClientToolsFilterFn,
  ClientToolsFilterMode,
  ToolPlanSpec,
} from "./intents";

/** Minimal logger the assembler uses when a builder throws. */
export interface SelectionLogger {
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
  debug?(message: string, context?: unknown): void;
}

/**
 * A per-factory builder: returns the tools for one {@link ClientFactoryKey}.
 * Synchronous — factory instantiation is synchronous in both apps, and this
 * lets `assembleClientTools` run inside a synchronous React `useMemo`. Resolve
 * any async work (e.g. fetching saved tools) before calling.
 */
export type ClientFactoryBuilder<TTool = ToolConfig> = () => TTool[];

/**
 * Adapters for {@link assembleClientTools}. The `builders` map is the gate: a
 * factory key with a builder produces its tools; a key with no builder produces
 * nothing. Each app supplies the builders for the capabilities its surface
 * supports (web: all; mobile: memory/connectors/document/slides today).
 */
export interface ToolSelectionAdapters<TTool = ToolConfig> {
  /** Logged to when a builder throws; assembly continues without that factory. */
  logger?: SelectionLogger;
  /** Per-factory builders. Presence gates the factory on. */
  builders: Partial<Record<ClientFactoryKey, ClientFactoryBuilder<TTool>>>;
}

/**
 * Instantiate the plan's client factories, gated by adapter presence, in the
 * canonical `clientFactories` order. A builder that throws is logged and
 * skipped so one failing capability never takes down the whole turn.
 *
 * The result is the CANDIDATE array. Apply {@link filterAssembledClientTools}
 * (or the semantic `autoFilterClientTools`) to trim it for the turn.
 *
 * Synchronous, so it can run directly inside a React `useMemo` (which is how
 * both apps build their per-turn client-tool list).
 */
export function assembleClientTools<TTool = ToolConfig>(
  spec: Pick<ToolPlanSpec, "clientFactories">,
  adapters: ToolSelectionAdapters<TTool>
): TTool[] {
  const out: TTool[] = [];
  for (const key of spec.clientFactories) {
    const build = adapters.builders[key];
    if (!build) continue; // capability-gated: no adapter → no tools for this factory
    try {
      const tools = build();
      if (tools?.length) out.push(...tools);
    } catch (err) {
      adapters.logger?.error(`[assembleClientTools] factory "${key}" threw; skipping`, err);
    }
  }
  return out;
}

/**
 * Apply the plan's static client-tools filter to the assembled candidates.
 *
 * - `include-all` → every tool (builder modes).
 * - `slide-editor` → only tools whose name is in `slideEditorToolNames`; when
 *   that set is absent it fails CLOSED (returns `[]`) so a missing name set can
 *   never leave the overlay silently unrestricted. Callers that want the full
 *   toolkit use `include-all`, not slide-editor-without-names.
 * - `auto` → returned unchanged; the caller runs the semantic
 *   `autoFilterClientTools` (which needs prompt embeddings) instead.
 * - a function → applied directly.
 */
export function filterAssembledClientTools<TTool = ToolConfig>(
  tools: TTool[],
  mode: ClientToolsFilterMode | ClientToolsFilterFn<TTool>,
  opts?: {
    /** Tool names the slide-editor overlay keeps (the slide tool set members). */
    slideEditorToolNames?: ReadonlySet<string>;
    /** Name accessor; defaults to the SDK's client-tool name reader. */
    getName?: (t: TTool) => string;
  }
): TTool[] | Promise<TTool[]> {
  if (typeof mode === "function") return mode(tools);
  if (mode === "include-all" || mode === "auto") return tools;
  // slide-editor — fail CLOSED: no resolved name set means no slide-editor
  // tools, so restrict to nothing rather than leaking the full candidate list.
  const names = opts?.slideEditorToolNames;
  if (!names) return [];
  const getName = opts?.getName ?? ((t: TTool) => getToolName(t as never));
  return tools.filter((t) => names.has(getName(t)));
}
