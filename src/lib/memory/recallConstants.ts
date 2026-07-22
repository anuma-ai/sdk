/**
 * Recall tool constants — deliberately dependency-free.
 *
 * Split out of `recallTool.ts` so the tool NAME can be referenced from
 * node/React-Native-safe modules (e.g. the client-tool selector in
 * `../tools/clientToolSelection`) without dragging `recall()` and its
 * WatermelonDB-backed operations into the module graph. `recallTool.ts`
 * re-exports these to preserve their public identity.
 */

/** Tool name surfaced to the LLM. Exported so bench harnesses and chat
 * clients reference the same string — drift between prod and bench would
 * mask tool-routing bugs in eval. */
export const RECALL_TOOL_NAME = "recall_memory";

/** Maximum results the executor will return to the LLM, regardless of
 * the LLM-supplied `limit`. */
export const RECALL_MAX_LIMIT = 50;
