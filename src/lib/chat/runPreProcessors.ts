/**
 * Standalone pre-processor runner used by the tool loop AND by external
 * orchestrators (Council/Compare manager) that want to resolve enrichment
 * once and fan results to N parallel workers.
 *
 * Behavior:
 *   1. Embed the prompt once (or reuse a caller-provided embedding).
 *   2. Run every pre-processor in parallel via `Promise.all`.
 *   3. Extract artifacts from `EnrichedPreProcessorResult` returns.
 *   4. Flatten message returns to `LlmapiMessage[]`.
 *
 * Failures in a single pre-processor are swallowed (logged) so a bad
 * wrapper does not abort the whole stage. Empty `preProcessors` or empty
 * prompt resolves to `{ messages: [], artifacts: [] }` without an
 * embedding fetch.
 *
 * Council workers should pass the returned `messages` as `enrichmentMessages`
 * and set `preProcessors: []` on their `useChat` so the stage doesn't re-run
 * per worker.
 */

import type { LlmapiMessage } from "../../client";
import { generateEmbedding } from "../memoryEngine/embeddings";
import type {
  PreProcessorArtifact,
  PromptPreProcessor,
  PromptPreProcessorContext,
} from "./preProcessor";
import { isEnrichedPreProcessorResult } from "./preProcessor";

/**
 * Soft cap. Wrappers are expected to trim before emit (see
 * `PreProcessorArtifact.payload` docs). We log a warning rather than
 * dropping so dev builds surface the issue while consumers still see
 * the artifact in prod — the renderer can trim defensively. Measured as
 * JSON-stringified character count, which equals byte count for ASCII;
 * for multi-byte content it under-counts slightly, which is fine for an
 * observability signal.
 */
const ARTIFACT_PAYLOAD_WARN_CHARS = 10 * 1024;

function warnIfPayloadOversize(artifact: PreProcessorArtifact): void {
  let size: number;
  try {
    size = JSON.stringify(artifact.payload).length;
  } catch {
    // Non-serializable payload — JSON.stringify threw or returned undefined.
    // The storage layer will surface a separate error on persist; nothing
    // useful to log here that wouldn't double up.
    return;
  }
  if (size > ARTIFACT_PAYLOAD_WARN_CHARS) {
    console.warn(
      `[runPreProcessors] artifact type="${artifact.type}" payload is ` +
        `${size} chars (>${ARTIFACT_PAYLOAD_WARN_CHARS}); trim before emit to ` +
        `keep persisted rows small`
    );
  }
}

export type RunPreProcessorsOptions = {
  /** Prompt text — the last user message in the conversation. */
  prompt: string;
  /** List of pre-processors to invoke. Empty array short-circuits. */
  preProcessors: PromptPreProcessor[];
  /**
   * Pre-computed embedding for `prompt`. When omitted, this helper embeds
   * the prompt once via `generateEmbedding` using `baseUrl` + auth.
   */
  embedding?: number[];
  /**
   * Auth for the embedding call (only used when `embedding` is omitted).
   * Pass exactly one of `apiKey` or `getToken`.
   */
  apiKey?: string;
  getToken?: () => Promise<string>;
  /** Portal base URL. Forwarded to `generateEmbedding`. */
  baseUrl?: string;
  /** Forwarded to each pre-processor and to the embedding call. */
  signal?: AbortSignal;
  /**
   * Fires once per artifact, as each pre-processor resolves. Order is
   * `Promise.all` completion order. Errors are swallowed.
   */
  onPreProcessorArtifact?: (artifact: PreProcessorArtifact) => void;
};

export type RunPreProcessorsResult = {
  /**
   * Flattened enrichment messages to forward to each worker's `useChat` via
   * `enrichmentMessages`. Empty array when no pre-processor produced messages.
   */
  messages: LlmapiMessage[];
  /**
   * Aggregated artifacts. Same shape `onPreProcessorArtifact` fires with.
   * Empty array when none were produced — never `undefined` here so the
   * caller can iterate without a null check.
   */
  artifacts: PreProcessorArtifact[];
};

export async function runPreProcessors(
  options: RunPreProcessorsOptions
): Promise<RunPreProcessorsResult> {
  const { prompt, preProcessors, signal, onPreProcessorArtifact } = options;

  if (!preProcessors.length || !prompt.trim()) {
    return { messages: [], artifacts: [] };
  }

  const embedding =
    options.embedding ??
    (await generateEmbedding(prompt, {
      apiKey: options.apiKey,
      getToken: options.getToken,
      baseUrl: options.baseUrl,
    }));

  const ctx: PromptPreProcessorContext = { prompt, embedding, signal };
  const artifacts: PreProcessorArtifact[] = [];

  // Artifacts fire INSIDE the per-pre-processor async wrapper so a slow
  // pre-processor doesn't hold up the renderer for a fast one's card. The
  // callback contract is "fires as each pre-processor resolves" — moving
  // this loop outside `Promise.all` would block all artifact emission on
  // the slowest pre-processor.
  const results = await Promise.all(
    preProcessors.map(async (p) => {
      try {
        const r = await p(ctx);
        if (isEnrichedPreProcessorResult(r) && r.artifacts) {
          for (const a of r.artifacts) {
            warnIfPayloadOversize(a);
            artifacts.push(a);
            try {
              onPreProcessorArtifact?.(a);
            } catch (cbErr) {
              console.warn("[runPreProcessors] onPreProcessorArtifact callback threw:", cbErr);
            }
          }
        }
        return r;
      } catch (err) {
        console.warn("[runPreProcessors] pre-processor failed:", err);
        return undefined;
      }
    })
  );

  // Messages are aggregated after the barrier so injection order matches
  // the `preProcessors` array order (deterministic LLM context layout),
  // independent of which pre-processor finished first.
  const messages: LlmapiMessage[] = [];
  for (const r of results) {
    if (Array.isArray(r)) {
      messages.push(...r);
    } else if (isEnrichedPreProcessorResult(r)) {
      messages.push(...r.messages);
    }
  }

  return { messages, artifacts };
}
