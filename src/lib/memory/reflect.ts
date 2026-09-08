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

/** Fallback portal URL — shared with the rest of the SDK via
 * `clientConfig.BASE_URL`, which already resolves the standard
 * `API_URL` / `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` env vars
 * across Node, browser, RN, and edge runtimes. */
const DEFAULT_BASE_URL = BASE_URL;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Minimum clock left on the shared deadline before the schema fallback retry is
 * worth issuing. A request that cannot plausibly finish is pure cost — it bills
 * a portal call and then aborts mid-flight.
 */
const MIN_RETRY_BUDGET_MS = 2_000;

/**
 * Floor for the output cap on the Responses transport.
 *
 * That transport exists for reasoning models, and reasoning tokens are billed
 * as OUTPUT — they come out of the same cap the answer does. A caller cap tuned
 * for a chat model (profile synthesis passes 512) can be spent entirely on
 * reasoning, which returns a 200 carrying no message text: a success that looks
 * exactly like "the model had nothing to say". Raise the floor rather than
 * rewrite every caller, and leave caps ABOVE the floor untouched.
 */
const MIN_RESPONSES_OUTPUT_TOKENS = 2_048;

/**
 * Non-OK statuses where dropping `response_format` cannot be the fix, so the
 * schema fallback is NOT attempted.
 *
 * Auth (401/403) and routing (404) are configuration, not request shape.
 * Transient/rate (408/409/425/429) say nothing about the body, and a same-tick
 * retry makes the pressure worse. 413 is excluded because the fallback moves
 * the schema INTO the prompt, which makes the body larger, not smaller.
 *
 * Everything else non-OK — 400, 422, and the 5xx range — is treated as
 * possibly-schema-caused. 5xx is IN deliberately: the portal masks upstream
 * provider rejections behind its own generic error, so the status the SDK sees
 * is not necessarily the status the provider returned.
 */
const SCHEMA_FALLBACK_SKIP_STATUSES = new Set([401, 403, 404, 408, 409, 413, 425, 429]);

/**
 * The outcome of one portal round-trip. `http` is split out from `error`
 * because only a server-issued status is evidence about the REQUEST's shape — a
 * network throw or an abort says nothing, and must never trigger a retry.
 */
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
  /** Override the grounding system prompt. */
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
  // Some models are only reachable on the Responses transport — the chat lane
  // rejects them at the provider, whatever the body looks like. That decides
  // the endpoint AND the body shape below, and it forecloses `response_format`
  // outright: the Responses API spells structured output differently
  // (`text.format`) and this portal has never been verified on it, so a schema
  // always rides in the system prompt there.
  const useResponsesTransport = requiresResponsesTransport(model);
  const sendResponseFormat =
    wantsStructured && !useResponsesTransport && supportsResponseFormat(model, "json_schema");
  const basePrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  // The caller's extra instruction sits BETWEEN the question and the evidence:
  // the evidence block has to stay the last thing in the turn (it is a numbered
  // list the model cites back by index, and appending after it would read as a
  // further entry), and putting it ahead of the question would bury the thing
  // being answered. See ReflectOptions.userInstructions.
  const userMessage = [
    `Question:\n${trimmed}`,
    ...(options.userInstructions ? [options.userInstructions] : []),
    `Memories (use only these as evidence):\n${evidence}`,
  ].join("\n\n");
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const fetchImpl = options.fetchFn ?? fetch;

  /**
   * The request body for one attempt. `useResponseFormat` is the ONLY axis that
   * varies between the first attempt and the schema fallback, and it moves BOTH
   * halves together: the schema rides either the `response_format` field or the
   * system prompt, never both and never neither. Splitting them is how a retry
   * that merely dropped the field would leave the model with no JSON
   * instruction at all.
   *
   * The base prompt stays a strict PREFIX in the fallback shape. The portal
   * matches internal task types (e.g. `memory_profile_synth`) with a substring
   * check against the system message, so appending the schema as a tail keeps
   * that match intact.
   */
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
        // Same system+user pair under the Responses-API field names: `input`
        // for the turns, `max_output_tokens` for the cap. Sending the
        // chat-completions spelling here is silently ignored, which caps the
        // answer at the portal default.
        input: messages,
        max_output_tokens: Math.max(maxTokens, MIN_RESPONSES_OUTPUT_TOKENS),
      });
    }
    return JSON.stringify({
      model,
      // Modern OpenAI field; the portal reads only `max_completion_tokens`
      // (the deprecated `max_tokens` is silently ignored → falls back to the
      // portal's default output cap and truncates the answer).
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

  // Dual-auth resolution (apiKey → x-api-key, else getToken → Bearer).
  // A failed token fetch degrades to the no-answer result like any other
  // LLM failure; providing neither credential throws (wiring bug).
  const authHeaders = await resolvePortalAuthHeaders(options, "memory/reflect");
  if (authHeaders === null) return baseResult;

  // ONE absolute end-to-end deadline for the whole call, INCLUDING the schema
  // fallback retry. The controller is per-ATTEMPT (a retry cannot reuse the
  // first attempt's — it may already be aborted and its timer cleared), but
  // every timer is armed off `remaining()`, so two attempts share the single
  // budget instead of getting one each.
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
        // No task type unless the caller named one — an undeclared task adds no
        // header at all, which is what keeps user-facing reflect() unlabelled.
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

    // Reported, not logged: whether a non-OK is recoverable is the caller's
    // decision, and logging here would emit two near-identical lines on a
    // double rejection.
    if (!response.ok) {
      return { kind: "http", status: response.status, statusText: response.statusText };
    }

    // Re-arm a fresh timer on THIS attempt's controller against the remaining
    // slice of the shared deadline — covers slow body streaming without
    // granting a new budget.
    const bodyTimer = setTimeout(() => controller.abort(), remaining());
    try {
      // Annotated, not inferred: `Response.json()` is typed `any`, and letting
      // that flow into `ReflectAttempt` both trips no-unsafe-assignment and
      // silently disarms the shape checks in `parseAnswer`.
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

  // The one recoverable failure: we asked for `response_format: json_schema`
  // and the portal refused the whole request.
  //
  // The gate that let us send it is per-PROVIDER (`RESPONSE_SCHEMA_OK` holds
  // "openai"), so a specific model under an allowed provider can still reject
  // the field. The portal masks the provider's reason, so the SDK cannot tell a
  // field rejection from a schema-keyword rejection from anything else — so
  // don't diagnose: retry once with the schema moved into the system prompt.
  // That is the request the SDK already sends to every model outside the
  // allowlist, on a path with existing coverage (`extractJsonCandidate`
  // tolerates the prose/fence wrapping it invites). Without it the caller gets
  // a degraded-empty result, which synthesizeProfile can only answer by keeping
  // a stale section.
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
      // Distinguishes "the fallback ran and still failed" from "never tried".
      schemaFallbackUsed,
    });
    return baseResult;
  }

  return parseAnswer(attempt.body, baseResult, !!options.responseSchema);
}

function parseAnswer(body: unknown, base: ReflectResult, parseSchema: boolean): ReflectResult {
  if (typeof body !== "object" || body === null) return base;
  const obj = body as Record<string, unknown>;
  // Shape-sniffing, shared with the rest of the memory pipeline: a Responses
  // body carries the answer in `output_text` / `output[]` (interleaved with
  // `type: "reasoning"` items that hold no text), a chat body in
  // `choices[0].message.content`.
  const text = extractCompletionContent(obj) ?? "";

  // The two transports spell usage differently — `prompt`/`completion` on chat,
  // `input`/`output` on Responses. Reading only the chat names would report
  // zeros for every Responses call and quietly break cost accounting.
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

  const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0;

  return {
    text,
    ...(structuredOutput !== undefined && { structuredOutput }),
    basedOn: base.basedOn,
    usage: {
      promptTokens,
      completionTokens,
      // Derived when absent: the Responses API reports the two component counts
      // and does not always send a total, which would otherwise report zero
      // spend for a call that plainly cost something.
      totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
    },
  };
}
