/**
 * `@anuma/sdk/tools/selection` — the node/React-Native/RSC-safe home of the SDK's
 * tool-selection engine and orchestration layer.
 *
 * This subpath exists so both `@anuma/sdk/react` (web) and `@anuma/sdk/expo`
 * (mobile), plus the standalone council path and Node unit tests, can share ONE
 * implementation of "which tools this turn":
 *
 * - The server- and client-tool selection ENGINE (`createServerToolsFilter`,
 *   `getServerTools` with a pluggable cache, `autoFilterClientTools`,
 *   `expandToolSetsAdditive`, `BUILT_IN_TOOL_SETS`, …), re-exported from
 *   `../../lib/tools`.
 * - The RESOLVER (`resolvePlan`, `assembleClientTools`, `deriveActiveToolSets`,
 *   council helpers, and the neutral intent/plan/catalog types), from
 *   `../../lib/tools/selection`.
 *
 * It deliberately pulls in neither React (recharts) nor WatermelonDB: the
 * embedding calls the engine needs come from the db-free `memoryEngine/generate`
 * core, so importing this subpath in a bare Node or Metro context does not drag
 * the database layer into the module graph.
 *
 * Note: this is its own build entry with isolated externals — the `tools/`
 * prefix is a naming grouping, NOT a slice of the `@anuma/sdk/tools` factory
 * bundle; the two share no dependency graph.
 */

// ── Selection engine (server + client tool selection, tool sets, cache) ──
export * from "../../lib/tools";

// ── Resolver / orchestration (intents, plan, assembly, active sets, council) ──
export * from "../../lib/tools/selection";

// ── Client-tool type consumers need when building factory adapters ──
export type { ToolConfig, ToolExecutor } from "../../lib/chat/useChat/types";
