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
import { recall } from "./recall.js";
import type { RecallContext, RecallOptions } from "./types.js";

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

export interface ReflectOptions extends RecallOptions {
  /** Override the answer model. Default: anthropic/claude-sonnet-4-6. */
  llmModel?: string;
  /** Cap response length. Default: 4096. */
  maxTokens?: number;
  /** Override the grounding system prompt. */
  systemPrompt?: string;
  /** Auth + endpoint for the answer LLM. */
  apiKey: string;
  baseUrl?: string;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
  /** Optional JSON Schema to coerce structured outputs. */
  responseSchema?: Record<string, unknown>;
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

  // Stage 1: retrieve.
  const recalled = await recall(trimmed, ctx, {
    types: options.types,
    limit: options.limit,
    budget: options.budget,
    minScore: options.minScore,
    scopes: options.scopes,
    folderId: options.folderId,
    conversationId: options.conversationId,
    excludeConversationId: options.excludeConversationId,
    includeChunks: options.includeChunks,
    decomposeOptions: options.decomposeOptions,
  });

  const memoryIds = recalled.memories.map((m) => m.id);
  const baseResult: ReflectResult = {
    text: "",
    basedOn: { memoryIds },
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };

  if (recalled.memories.length === 0) {
    // No evidence — return the empty answer rather than letting the LLM
    // hallucinate. Callers can detect this via the empty memoryIds list.
    return baseResult;
  }

  // Stage 2: synthesize. Format memories as a numbered citable list.
  const evidence = recalled.memories
    .map((m, i) => `[${i + 1}] (id: ${m.id}, kind: ${m.kind})\n${m.content}`)
    .join("\n\n");

  const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const userMessage = `Question:\n${trimmed}\n\nMemories (use only these as evidence):\n${evidence}`;

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.llmModel ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const fetchImpl = options.fetchFn ?? fetch;

  const log = getLogger();
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
      headers: { "x-api-key": options.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        ...(options.responseSchema && {
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
    try {
      structuredOutput = JSON.parse(text);
    } catch {
      // schema requested but model didn't return valid JSON — leave undefined
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
