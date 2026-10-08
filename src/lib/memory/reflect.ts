import { BASE_URL } from "../../clientConfig.js";
import { getLogger } from "../logger.js";
import { type TaskType, taskTypeHeader } from "../taskType.js";
import {
  extractCompletionContent,
  extractJsonCandidate,
  type PortalLlmAuth,
  requiresResponsesTransport,
  resolvePortalAuthHeaders,
  supportsResponseFormat,
} from "./portalLlm.js";
import { recall } from "./recall.js";
import type { RankedMemory, RecallContext, RecallOptions } from "./types.js";

const DEFAULT_BASE_URL = BASE_URL;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;

const MIN_RETRY_BUDGET_MS = 2_000;

const MIN_RESPONSES_OUTPUT_TOKENS = 2_048;

const SCHEMA_FALLBACK_SKIP_STATUSES = new Set([401, 403, 404, 408, 409, 413, 425, 429]);

type ReflectAttempt =
  | { kind: "ok"; body: unknown }
  | { kind: "http"; status: number; statusText: string }
  | { kind: "error" };

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
  /**
   * Override the grounding system prompt.
   *
   * ⚠ DOING THIS MAKES THE REQUEST'S PROVENANCE YOURS. The default prompt's first sentence is
   * this flow's fingerprint in the portal's freeloader (anti-bot) detector (see
   * {@link DEFAULT_SYSTEM_PROMPT}); replacing it wholesale removes that, and a free-tier request
   * carrying no recognised provenance is rejected outright once the portal's markerless reject is
   * enabled — a 403, not a degraded answer.
   *
   * Which replacement is correct depends on what the call IS, and there is no safe default:
   *
   * - **A background/internal call** (a fixed-purpose helper, not a user's own question): prepend
   *   {@link withInternalFlowMarker}, which is exported for exactly this. That is what
   *   profile-facet synthesis does.
   * - **A user-facing call** (the person is asking their own question and expects an answer):
   *   do NOT use the internal marker — it asserts "not user chat" and would be false. Keep the
   *   default prompt, or append your instructions to it rather than replacing it, so the
   *   fingerprint survives. A genuinely distinct user-facing flow needs its own fingerprint
   *   registered in ai-portal `internal/detection/markers.go`.
   *
   * Appending is the cheap way to stay safe: `${DEFAULT_SYSTEM_PROMPT}\n\n${yourInstructions}`
   * keeps the fingerprint as a prefix. `reflect.test.ts` pins both the marked and the bare
   * override paths so this stays true.
   */
  systemPrompt?: string;
  /**
   * Extra caller instruction to carry on the USER turn, between the question and
   * the evidence block (see the `userMessage` assembly below). This is the slot a
   * background caller uses to keep its per-request data OUT of the system message
   * without colliding with the numbered evidence list — profile-facet synthesis
   * puts its section label, guidance and response-field hint here so its system
   * half can stay fixed and server-ownable.
   */
  userInstructions?: string;
  /**
   * Class-B task name for the `X-Anuma-Task-Type` header, or nothing.
   *
   * Deliberately OPTIONAL and unset by default. reflect() also answers the user's
   * OWN question, and that traffic is chat, not an internal flow — declaring a
   * task type unconditionally here would put an internal-flow name on real
   * conversation, which is the same boundary `INTERNAL_FLOW_MARKER` draws
   * (reflect is deliberately unmarked; its background caller marks its own
   * prompt — see ../internalFlowMarker.ts). So the name is per call: only a
   * caller with ONE fixed purpose passes
   * one, and today that is profile-facet synthesis (`memory_profile_synth`).
   */
  taskType?: TaskType;
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
    return baseResult;
  }

  const evidence = recalledMemories
    .map((m, i) => `[${i + 1}] (id: ${m.id}, kind: ${m.kind})\n${m.content}`)
    .join("\n\n");

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.llmModel ?? DEFAULT_MODEL;

  const wantsStructured = !!options.responseSchema;
  const useResponsesTransport = requiresResponsesTransport(model);
  const sendResponseFormat =
    wantsStructured && !useResponsesTransport && supportsResponseFormat(model, "json_schema");
  const basePrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const userMessage = [
    `Question:\n${trimmed}`,
    ...(options.userInstructions ? [options.userInstructions] : []),
    `Memories (use only these as evidence):\n${evidence}`,
  ].join("\n\n");
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const fetchImpl = options.fetchFn ?? fetch;

  const buildBody = (useResponseFormat: boolean): string => {
    const systemPrompt =
      wantsStructured && !useResponseFormat
        ? `${basePrompt}\n\nRespond with ONLY a single JSON object conforming to this JSON Schema, with no prose, comments, or code fences:\n${JSON.stringify(
            options.responseSchema
          )}`
        : basePrompt;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];
    if (useResponsesTransport) {
      return JSON.stringify({
        model,
        input: messages,
        max_output_tokens: Math.max(maxTokens, MIN_RESPONSES_OUTPUT_TOKENS),
      });
    }
    return JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      messages,
      ...(useResponseFormat && {
        response_format: {
          type: "json_schema",
          json_schema: { name: "reflect_output", schema: options.responseSchema },
        },
      }),
    });
  };

  const log = getLogger();

  const authHeaders = await resolvePortalAuthHeaders(options, "memory/reflect");
  if (authHeaders === null) return baseResult;

  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  const remaining = () => Math.max(0, deadline - Date.now());

  const endpoint = useResponsesTransport ? "/api/v1/responses" : "/api/v1/chat/completions";

  const sendOnce = async (useResponseFormat: boolean): Promise<ReflectAttempt> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining());

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          ...authHeaders,
          ...taskTypeHeader(options.taskType),
          "Content-Type": "application/json",
        },
        body: buildBody(useResponseFormat),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      log.warn("[memory/reflect] portal request failed", {
        err: err instanceof Error ? err.message : String(err),
        baseUrl,
      });
      return { kind: "error" };
    }
    clearTimeout(timer);

    if (!response.ok) {
      return { kind: "http", status: response.status, statusText: response.statusText };
    }

    const bodyTimer = setTimeout(() => controller.abort(), remaining());
    try {
      const body: unknown = await response.json();
      clearTimeout(bodyTimer);
      return { kind: "ok", body };
    } catch (err) {
      clearTimeout(bodyTimer);
      log.warn("[memory/reflect] failed to parse portal response body", {
        err: err instanceof Error ? err.message : String(err),
      });
      return { kind: "error" };
    }
  };

  let attempt = await sendOnce(sendResponseFormat);
  let schemaFallbackUsed = false;

  const budgetLeftMs = remaining();
  if (
    attempt.kind === "http" &&
    sendResponseFormat &&
    !SCHEMA_FALLBACK_SKIP_STATUSES.has(attempt.status) &&
    budgetLeftMs >= MIN_RETRY_BUDGET_MS
  ) {
    log.warn("[memory/reflect] response_format json_schema rejected; retrying schema-in-prompt", {
      status: attempt.status,
      statusText: attempt.statusText,
      model,
      taskType: options.taskType,
      budgetLeftMs,
    });
    schemaFallbackUsed = true;
    attempt = await sendOnce(false);
  }

  if (attempt.kind === "error") return baseResult;
  if (attempt.kind === "http") {
    log.warn("[memory/reflect] portal returned non-OK", {
      status: attempt.status,
      statusText: attempt.statusText,
      schemaFallbackUsed,
    });
    return baseResult;
  }

  return parseAnswer(attempt.body, baseResult, !!options.responseSchema);
}

function parseAnswer(body: unknown, base: ReflectResult, parseSchema: boolean): ReflectResult {
  if (typeof body !== "object" || body === null) return base;
  const obj = body as Record<string, unknown>;
  const text = extractCompletionContent(obj) ?? "";

  const usage = obj.usage as
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        input_tokens?: number;
        output_tokens?: number;
      }
    | undefined;

  let structuredOutput: unknown;
  if (parseSchema && text) {
    try {
      structuredOutput = JSON.parse(extractJsonCandidate(text));
    } catch (err) {
      getLogger().warn("[memory/reflect] structured output was not valid JSON", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0;

  return {
    text,
    ...(structuredOutput !== undefined && { structuredOutput }),
    basedOn: base.basedOn,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
    },
  };
}
