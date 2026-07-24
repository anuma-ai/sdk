/**
 * Reflect — agentic answer synthesis grounded in memory.
 *
 * The third leg of the recall / retain / reflect trio (Hindsight surface).
 *
 *   recall(query)  → ranked list of memories
 *   retain(fact)   → store/merge a fact
 *   reflect(query) → grounded answer using memories as evidence
 *
 * Today: single-shot "retrieve then answer" — calls recall() to fetch
 * top-K relevant memories, builds a system prompt that includes them as
 * citable evidence, then asks the LLM to synthesize a grounded answer.
 * Returns the text plus the IDs of memories the answer was based on.
 *
 * Future: multi-step agentic loop (the model can request more recall
 * passes mid-reasoning), structured output via JSON schema, disposition
 * traits applied to the system prompt. The function shape is fixed now
 * so callers don't churn when those land.
 */

import { BASE_URL } from "../../clientConfig.js";
import { getLogger } from "../logger.js";
import {
  extractJsonCandidate,
  type PortalLlmAuth,
  resolvePortalAuthHeaders,
  supportsResponseFormat,
} from "./portalLlm.js";
import { recall } from "./recall.js";
import type { RankedMemory, RecallContext, RecallOptions } from "./types.js";

/** Fallback portal URL — shared with the rest of the SDK via
 * `clientConfig.BASE_URL`, which already resolves the standard
 * `API_URL` / `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` env vars
 * across Node, browser, RN, and edge runtimes. */
const DEFAULT_BASE_URL = BASE_URL;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;

const DEFAULT_SYSTEM_PROMPT = `You are a personal assistant with access to the user's memory. Answer the user's question using the supplied memories as evidence.

Rules:
- Ground every claim in the provided memories — do not invent facts the memories don't support.
- If the memories don't cover the question, say so plainly. Don't guess.
- Be concise and direct. Match the user's question style.
- When citing a fact, prefer the exact phrasing the memory uses (numbers, names, dates).`;

/**
 * Options for {@link reflect}. Auth for the answer LLM is the dual pattern
 * inherited from {@link PortalLlmAuth} — one of `apiKey` / `getToken` is
 * required at runtime; `apiKey` wins when both are set.
 */
export interface ReflectOptions extends RecallOptions, PortalLlmAuth {
  /** Override the answer model. Default: anthropic/claude-sonnet-4-6. */
  llmModel?: string;
  /** Cap response length. Default: 4096. */
  maxTokens?: number;
  /** Override the grounding system prompt. */
  systemPrompt?: string;
  /** Endpoint for the answer LLM. */
  baseUrl?: string;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
  /** Optional JSON Schema to coerce structured outputs. */
  responseSchema?: Record<string, unknown>;
  /**
   * Skip Stage-1 {@link recall} and synthesize from these memories instead.
   * Used by `synthesizeProfile` after intersecting recall with a
   * `reviewedMemoryIds` gate so the LLM never sees unreviewed evidence.
   */
  memories?: RankedMemory[];
}

export interface ReflectResult {
  /** The synthesized answer text. */
  text: string;
  /** Parsed structured output when `responseSchema` is provided. */
  structuredOutput?: unknown;
  /** Citations: memory ids the answer was grounded on. */
  basedOn: { memoryIds: string[] };
  /** Token accounting from the LLM call. */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Synthesize a grounded answer to `query` using the user's memory as
 * evidence. On any LLM failure, returns an empty result with the
 * recalled memory ids — the caller can decide whether to retry or fall
 * back to a non-grounded response.
 */
export async function reflect(
  query: string,
  ctx: RecallContext,
  options: ReflectOptions
): Promise<ReflectResult> {
  const trimmed = query.trim();
  const empty: ReflectResult = {
    text: "",
    basedOn: { memoryIds: [] },
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
  if (trimmed.length === 0) return empty;

  // Stage 1: retrieve. `ReflectOptions extends RecallOptions`, so forward the
  // options object — recall ignores the other reflect-only fields (llmModel,
  // systemPrompt, …). Forwarding the set (rather than cherry-picking) avoids
  // silently dropping `now` and the ranking knobs (recencyAlpha, rrfK, mmr, …),
  // which back-dated eval harnesses and ablation sweeps rely on.
  //
  // EXCEPT `maxTokens`: it collides by name but not by meaning — on
  // `ReflectOptions` it caps the answer LLM (`max_tokens`), while on
  // `RecallOptions` it is a recall result-set token budget (reserved for W1).
  // Forwarding it would wire an LLM response cap into recall's budget slot, so
  // strip it here and let the LLM-side read `options.maxTokens` below.
  //
  // EXCEPT `memories`: when the caller already selected evidence (e.g. profile
  // publish review), skip recall entirely and use that list.
  const { maxTokens: _llmMaxTokens, memories: providedMemories, ...recallOptions } = options;
  const recalledMemories =
    providedMemories !== undefined
      ? providedMemories
      : (await recall(trimmed, ctx, recallOptions)).memories;

  const memoryIds = recalledMemories.map((m) => m.id);
  const baseResult: ReflectResult = {
    text: "",
    basedOn: { memoryIds },
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };

  if (recalledMemories.length === 0) {
    // No evidence — return the empty answer rather than letting the LLM
    // hallucinate. Callers can detect this via the empty memoryIds list.
    return baseResult;
  }

  // Stage 2: synthesize. Format memories as a numbered citable list.
  const evidence = recalledMemories
    .map((m, i) => `[${i + 1}] (id: ${m.id}, kind: ${m.kind})\n${m.content}`)
    .join("\n\n");

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.llmModel ?? DEFAULT_MODEL;

  // `response_format: json_schema` is only honored by some providers; the
  // default model is Anthropic, which ignores it. Gate the field the same way
  // the rest of the memory pipeline gates `response_format` (see
  // `supportsResponseFormat`). When a schema is requested but the model can't
  // take the flag, fall back to a strict-JSON system-prompt instruction so the
  // model still tries to emit parseable JSON instead of prose.
  const wantsStructured = !!options.responseSchema;
  // reflect sends the `json_schema` variant specifically — gate on that subset
  // (OpenAI structured outputs), not the broader json_object allowlist, so a
  // model that takes json_object but not json_schema falls back to the
  // prompt-instruction path instead of 400-ing.
  const sendResponseFormat = wantsStructured && supportsResponseFormat(model, "json_schema");
  const basePrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemPrompt =
    wantsStructured && !sendResponseFormat
      ? `${basePrompt}\n\nRespond with ONLY a single JSON object conforming to this JSON Schema, with no prose, comments, or code fences:\n${JSON.stringify(
          options.responseSchema
        )}`
      : basePrompt;
  const userMessage = `Question:\n${trimmed}\n\nMemories (use only these as evidence):\n${evidence}`;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const fetchImpl = options.fetchFn ?? fetch;

  const log = getLogger();

  // Dual-auth resolution (apiKey → x-api-key, else getToken → Bearer).
  // A failed token fetch degrades to the no-answer result like any other
  // LLM failure; providing neither credential throws (wiring bug).
  const authHeaders = await resolvePortalAuthHeaders(options, "memory/reflect");
  if (authHeaders === null) return baseResult;

  const controller = new AbortController();
  // Single end-to-end deadline so the header timer + body timer can't
  // double the budget (was up to ~2×REQUEST_TIMEOUT_MS before).
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  const remaining = () => Math.max(0, deadline - Date.now());
  const timer = setTimeout(() => controller.abort(), remaining());

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        ...(sendResponseFormat && {
          response_format: {
            type: "json_schema",
            json_schema: { name: "reflect_output", schema: options.responseSchema },
          },
        }),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    log.warn("[memory/reflect] portal request failed", {
      err: err instanceof Error ? err.message : String(err),
      baseUrl,
    });
    return baseResult;
  }
  clearTimeout(timer);

  if (!response.ok) {
    log.warn("[memory/reflect] portal returned non-OK", {
      status: response.status,
      statusText: response.statusText,
    });
    return baseResult;
  }

  // Re-arm the same controller against the remaining slice of the
  // single deadline — covers slow body streaming without granting a
  // fresh 60s budget.
  const bodyTimer = setTimeout(() => controller.abort(), remaining());
  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    clearTimeout(bodyTimer);
    log.warn("[memory/reflect] failed to parse portal response body", {
      err: err instanceof Error ? err.message : String(err),
    });
    return baseResult;
  }
  clearTimeout(bodyTimer);

  return parseAnswer(body, baseResult, !!options.responseSchema);
}

function parseAnswer(body: unknown, base: ReflectResult, parseSchema: boolean): ReflectResult {
  if (typeof body !== "object" || body === null) return base;
  const obj = body as Record<string, unknown>;
  const choices = obj.choices;
  let text = "";
  if (Array.isArray(choices) && choices.length > 0) {
    const message = (choices[0] as Record<string, unknown>).message;
    if (typeof message === "object" && message !== null) {
      const content = (message as Record<string, unknown>).content;
      if (typeof content === "string") text = content;
    }
  }

  const usage = obj.usage as
    | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    | undefined;

  let structuredOutput: unknown;
  if (parseSchema && text) {
    // Models that took `response_format` return clean JSON; models that fell
    // back to the prompt instruction (Anthropic et al.) may wrap it in prose
    // or a ```json fence — extract the JSON candidate before parsing, same as
    // the rest of the pipeline.
    try {
      structuredOutput = JSON.parse(extractJsonCandidate(text));
    } catch (err) {
      // Schema requested but model didn't return valid JSON — leave undefined,
      // but surface it: a silent `undefined` is otherwise undiagnosable.
      getLogger().warn("[memory/reflect] structured output was not valid JSON", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    text,
    ...(structuredOutput !== undefined && { structuredOutput }),
    basedOn: base.basedOn,
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}
