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

/**
 * What a memory tool tells the ANSWER MODEL when a search came back empty while
 * the semantic lane was down.
 *
 * "No relevant memories found" would be a lie in that state, and a costly one:
 * the model treats it as evidence the user never mentioned the thing and answers
 * confidently in the negative. Naming the degradation instead lets it hedge or
 * retry with different wording — keyword matching is all that ran, so different
 * words genuinely change the outcome.
 *
 * Lives here, not next to either tool, because BOTH the `recall_memory` executor
 * (`recallTool.ts`) and the vault search tool (`memoryVault/searchTool.ts`) show
 * it. Two copies of a model-facing string drift, and the drift is invisible —
 * only the model ever reads it.
 */
export const EMBEDDINGS_DEGRADED_EMPTY =
  "Semantic memory search is temporarily unavailable, so only keyword matching ran " +
  "and it found no matches. Do not conclude the user has no such memory — say the " +
  "memory lookup was degraded, or retry with different keywords.";
