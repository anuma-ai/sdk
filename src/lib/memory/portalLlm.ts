/**
 * Shared portal LLM call for the memory pipeline.
 *
 * The three LLM-driven steps (`extractFacts`, `consolidateMemory`,
 * `decomposeQuery`) share the same shape: POST to `/api/v1/chat/completions`
 * with a system+user prompt and `response_format: json_object`, parse
 * `choices[0].message.content` as JSON, validate, return null on any failure.
 * This helper owns the fetch+timeout+parse+log boilerplate so each caller
 * stays focused on its prompt and validator.
 */

import { BASE_URL } from "../../clientConfig.js";
import { getLogger } from "../logger.js";

/** Read per-call so tests that mutate `process.env` between imports take effect. */
function defaultBaseUrl(): string {
  return (typeof process !== "undefined" && process.env?.ANUMA_PORTAL_BASE_URL) || BASE_URL;
}

/**
 * Auth for portal LLM calls (extraction, consolidation, decomposition,
 * reflection). Mirrors `memoryEngine`'s `EmbeddingOptions` dual-auth:
 *
 * - `apiKey`: For direct API keys (uses x-api-key header)
 * - `getToken`: For Privy identity tokens (uses Authorization: Bearer header)
 *
 * At least one of `apiKey` or `getToken` must be provided (enforced at
 * runtime); `apiKey` takes precedence when both are set.
 *
 * @public
 */
export interface PortalLlmAuth {
  /** Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided. */
  apiKey?: string;
  /** Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`. */
  getToken?: () => Promise<string | null>;
}

interface PortalLlmRequest extends PortalLlmAuth {
  baseUrl?: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  /** Tag prefix for log lines, e.g. `"memory/extract"`. */
  tag: string;
  /** Per-request timeout. Covers fetch headers AND body read. Default
   * 60s — sized for slower providers (Anthropic Sonnet under high
   * concurrency routinely takes 15–40s for the 2k-token consolidate
   * prompt). Pass a tighter value for steps on the recall hot path. */
  timeoutMs?: number;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
  /** Optional extra fields merged into the request body (e.g. `max_tokens`). */
  extra?: Record<string, unknown>;
  /**
   * Max attempts on a TRANSIENT failure (network/timeout, 408/409/425/429, any
   * 5xx, an empty completion, or a completion with no parseable JSON). Default
   * 3. Set to 1 to disable retries on a latency-sensitive path that already has
   * a cheap fallback (e.g. query decompose).
   *
   * Terminal failures (4xx other than the codes above — notably 400/401/403/
   * 404 — and missing/failed auth) never retry: a 400 is a bad request that
   * won't succeed on a retry, just burning latency and (if metered) credits.
   */
  maxAttempts?: number;
  /**
   * Absolute wall-clock budget (ms) across ALL attempts incl. backoff. When
   * set, the loop stops before an attempt that would exceed it, so worst-case
   * latency is bounded rather than `maxAttempts × timeoutMs`. Use it on a
   * guarded path (e.g. auto-extract behind an in-flight-turn guard) so a stuck
   * call can't hold the turn open ~3× the per-attempt timeout.
   */
  totalTimeoutMs?: number;
  /**
   * Backoff before the next attempt, in ms, given the just-failed 1-based
   * attempt index. Defaults to exponential (250·2^(n-1), capped at 2s) plus
   * jitter. A server `Retry-After` on a 429 takes precedence (max of the two).
   * Tests pass `() => 0` to retry without real delay.
   */
  backoffMs?: (attempt: number) => number;
}

/**
 * Outcome of a single attempt — distinguishes retryable from terminal.
 * `retryAfterMs` carries a server-provided `Retry-After` (429) so the wrapper
 * can honor it instead of the fixed backoff.
 */
type AttemptOutcome =
  | { kind: "ok"; value: unknown }
  | { kind: "retryable"; reason: string; retryAfterMs?: number }
  | { kind: "terminal"; reason: string };

// Transient 4xx only. 400 is deliberately EXCLUDED — it's a bad request that
// won't succeed on retry. (gpt-oss's response_format 400 is already prevented
// by the omission gate below, so it never reaches the retry path.)
const RETRYABLE_HTTP = new Set([408, 409, 425, 429]);

function isRetryableStatus(status: number): boolean {
  return status >= 500 || RETRYABLE_HTTP.has(status);
}

/** Parse a `Retry-After` header (delta-seconds or HTTP-date) to ms, or null. */
function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function defaultBackoffMs(attempt: number): number {
  const base = Math.min(2000, 250 * 2 ** (attempt - 1));
  return base + Math.floor(Math.random() * 100);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve dual-auth credentials into request headers (see
 * {@link PortalLlmAuth}): `apiKey` wins and is sent as `x-api-key`;
 * otherwise `getToken` is awaited and sent as `Authorization: Bearer`.
 *
 * Returns null (after logging with the supplied tag) when the token fetch
 * throws or yields no token — matching this module's "null on any failure"
 * contract. Throws when NEITHER credential is provided: that is a caller
 * wiring bug, not a transient failure, and must be loud.
 */
export async function resolvePortalAuthHeaders(
  auth: PortalLlmAuth,
  tag: string
): Promise<Record<string, string> | null> {
  if (auth.apiKey) {
    return { "x-api-key": auth.apiKey };
  }
  if (auth.getToken) {
    let token: string | null;
    try {
      token = await auth.getToken();
    } catch (err) {
      getLogger().warn(`[${tag}] getToken threw`, err);
      return null;
    }
    if (!token) {
      getLogger().warn(`[${tag}] getToken returned no token`);
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  }
  throw new Error(`[${tag}] Either apiKey or getToken must be provided`);
}

/**
 * Call the portal's chat completions endpoint and return the parsed JSON
 * content, or null on any failure (network, non-2xx, malformed JSON, etc).
 * Every failure mode logs via the SDK logger with the supplied tag.
 *
 * Auth: one of `apiKey` / `getToken` is required — see {@link PortalLlmAuth}.
 * A failed token fetch returns null like any other transient failure;
 * providing neither credential throws.
 */
export async function callPortalJsonCompletion(req: PortalLlmRequest): Promise<unknown> {
  const log = getLogger();
  const maxAttempts = Math.max(1, req.maxAttempts ?? 3);
  const startedAt = Date.now();
  const overBudget = () =>
    req.totalTimeoutMs !== undefined && Date.now() - startedAt >= req.totalTimeoutMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Stop if already over budget before starting a retry (allow first attempt)
    if (attempt > 1 && overBudget()) {
      log.warn(`[${req.tag}] over time budget before attempt ${attempt}, giving up`);
      break;
    }
    // Cap this attempt's timeout to the remaining budget (floored at 1ms so a
    // nearly-spent budget can't pass a negative/zero timeout that aborts before
    // the request is even sent).
    const attemptReq =
      req.totalTimeoutMs !== undefined
        ? {
            ...req,
            timeoutMs: Math.max(
              1,
              Math.min(req.timeoutMs ?? 60_000, req.totalTimeoutMs - (Date.now() - startedAt))
            ),
          }
        : req;
    const outcome = await attemptPortalJson(attemptReq);
    if (outcome.kind === "ok") return outcome.value;
    if (outcome.kind === "terminal") {
      log.warn(`[${req.tag}] ${outcome.reason}`);
      return null;
    }
    // Retryable. Log with attempt context; back off before the next try.
    if (attempt >= maxAttempts) {
      log.warn(`[${req.tag}] ${outcome.reason} — attempt ${attempt}/${maxAttempts}, giving up`);
      break;
    }
    // Honor a server Retry-After (429) over the fixed backoff when it's larger.
    const backoff = (req.backoffMs ?? defaultBackoffMs)(attempt);
    const delay = Math.max(backoff, outcome.retryAfterMs ?? 0);
    // Stop if the next attempt (or even the wait before it) would blow the
    // absolute budget — keeps worst-case latency bounded on guarded paths.
    if (
      overBudget() ||
      (req.totalTimeoutMs !== undefined && Date.now() - startedAt + delay >= req.totalTimeoutMs)
    ) {
      log.warn(
        `[${req.tag}] ${outcome.reason} — attempt ${attempt}/${maxAttempts}, over time budget, giving up`
      );
      break;
    }
    log.warn(`[${req.tag}] ${outcome.reason} — attempt ${attempt}/${maxAttempts}, retrying`);
    if (delay > 0) await sleep(delay);
  }
  return null;
}

/**
 * One request attempt. Returns a classified outcome so the caller can decide
 * whether to retry. Operational failures map to `retryable`/`terminal`; only a
 * missing-credentials wiring error throws (by contract — see
 * {@link resolvePortalAuthHeaders}).
 *
 * Auth is resolved PER ATTEMPT, not once up front: a short-lived `getToken`
 * can expire across retries + backoff, so each attempt fetches a fresh token.
 * A token that's unavailable (fetch failed / returned null) is terminal — we
 * don't retry the token service in a tight loop.
 */
async function attemptPortalJson(req: PortalLlmRequest): Promise<AttemptOutcome> {
  const baseUrl = req.baseUrl ?? defaultBaseUrl();
  const fetchImpl = req.fetchFn ?? fetch;
  const timeoutMs = req.timeoutMs ?? 60_000;

  const authHeaders = await resolvePortalAuthHeaders(req, req.tag);
  // Missing/failed auth is TERMINAL, not retryable: a missing token or a token
  // service that rejects us won't be fixed by hammering it 3× in a tight loop,
  // and it matches the documented contract. (Token EXPIRY across retries is a
  // separate concern, already handled by resolving auth per attempt.)
  if (authHeaders === null) return { kind: "terminal", reason: "auth unavailable (no token)" };

  // Anthropic models ignore OpenAI-style response_format and frequently
  // respond conversationally to bare user queries. The canonical fix is
  // to "prefill" the assistant turn with `{` so the model has no choice
  // but to continue valid JSON. We prepend the prefill back onto the
  // returned content before parsing.
  const isAnthropic = req.model.startsWith("anthropic/");
  const prefill = isAnthropic ? "{" : "";
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: req.systemPrompt },
    { role: "user", content: req.userMessage },
  ];
  if (prefill) messages.push({ role: "assistant", content: prefill });

  // `response_format: json_object` support is model-specific, not universal.
  // gpt-oss-120b (Cerebras) rejects the whole request with a 400 if it's
  // present; OpenAI, ling-2.6-flash, and deepseek-v4 all accept it (verified
  // 2026-06). Send it only to models whose provider is confirmed to accept it;
  // an UNKNOWN provider defaults to OMITTING it, so a newly-added model
  // degrades to a bare prompt-instructed request (which still works via the
  // strict-JSON system prompt + the tolerant `extractJsonCandidate` parser
  // below) rather than hard-failing on a 400. Anthropic ignores the flag and
  // uses the prefill path above.
  //
  // Match on path SEGMENTS, not a raw substring: model ids are
  // `provider/model` (or proxied `openrouter/openai/model`), so splitting on
  // `/` matches `openai` in both `openai/x` and `openrouter/openai/x` without
  // a coincidental id like `someprovider-openai/x` wrongly qualifying.
  const RESPONSE_FORMAT_OK = new Set(["openai", "inclusionai", "deepseek"]);
  const supportsJsonObjectFormat = req.model.split("/").some((seg) => RESPONSE_FORMAT_OK.has(seg));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Build the body explicitly so the gate has final say: callers can pass
  // arbitrary overrides via `extra`, but a model that 400s on response_format
  // must never receive it — not even through an accidental `extra` override.
  const requestBody: Record<string, unknown> = {
    model: req.model,
    messages,
    ...(supportsJsonObjectFormat && { response_format: { type: "json_object" } }),
    ...req.extra,
  };
  if (!supportsJsonObjectFormat) delete requestBody.response_format;

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    // Network error or timeout abort — transient by nature.
    return { kind: "retryable", reason: `fetch failed: ${(err as Error).message}` };
  }

  if (!response.ok) {
    clearTimeout(timer);
    const reason = `portal returned ${response.status}`;
    // A 401 on the TOKEN path may just be an expired token: retry so the next
    // attempt re-resolves getToken and sends a fresh one. With a static apiKey
    // (which can't expire) a 401 is a genuine auth failure and stays terminal.
    // Auth precedence is apiKey-then-getToken, so "token path" = no apiKey.
    if (response.status === 401) {
      const tokenAuth = !req.apiKey && !!req.getToken;
      return tokenAuth
        ? { kind: "retryable", reason: `${reason} (token may be expired; refreshing)` }
        : { kind: "terminal", reason };
    }
    if (!isRetryableStatus(response.status)) return { kind: "terminal", reason };
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    return retryAfterMs !== null
      ? { kind: "retryable", reason, retryAfterMs }
      : { kind: "retryable", reason };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    clearTimeout(timer);
    return { kind: "retryable", reason: `response body parse failed: ${(err as Error).message}` };
  }
  clearTimeout(timer);

  const rawContent = extractCompletionContent(body);
  if (!rawContent) {
    // Empty completion — reasoning-class models do this intermittently.
    return { kind: "retryable", reason: "portal response had no completion content" };
  }

  // Anthropic prefill (`{`) isn't echoed in the response — the model
  // continues from it. Detect that case (response trimstart is a JSON
  // continuation token like `"`, indicating a quoted object key) and
  // prepend the prefill back. If the response starts with `{` or `[`,
  // the prefill was either echoed or ignored — no need to prepend.
  // If it starts with prose, the extractor below finds the first
  // balanced brace block, so prepending would just corrupt input.
  const looksLikeContinuation = prefill && /^\s*"/.test(rawContent);
  const content = looksLikeContinuation ? prefill + rawContent : rawContent;

  // Anthropic (and some other providers) ignore the OpenAI-style
  // `response_format: json_object` flag and may prepend prose or wrap
  // the JSON in a ```json fence. Strip both before parsing — the LLM
  // intent is clear from the structure, and a one-off prose preamble
  // shouldn't blow the whole extraction/decompose/consolidate step.
  const candidate = extractJsonCandidate(content);
  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch (err) {
    // The model returned prose with no parseable JSON (e.g. echoed the
    // instruction, or asked a clarifying question) — retry; it's usually a
    // one-off of the model's nondeterminism.
    return {
      kind: "retryable",
      reason: `completion was not valid JSON: ${(err as Error).message}`,
    };
  }
  // A literal `null` body is never a valid memory response, and callers use
  // `null` as their failure sentinel — treat it as a transient miss to retry,
  // not a successful empty (otherwise callers short-circuit without retrying).
  if (value === null) {
    return { kind: "retryable", reason: "completion parsed to null" };
  }
  return { kind: "ok", value };
}

/**
 * Best-effort JSON extraction from a possibly-prose-wrapped response:
 *   1. Pull from a ```json … ``` (or ```… ```) code fence if present.
 *   2. Otherwise take the longest balanced object/array starting at the
 *      first `{`/`[`. A bare brace-scan is too greedy when the model
 *      includes a trailing prose sentence after the JSON.
 *   3. Fall back to the trimmed original so JSON.parse surfaces a real
 *      error rather than us silently returning {}.
 */
function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;

  const start = body.search(/[{[]/);
  if (start < 0) return body;
  const open = body[start];
  const close = open === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return body;
}

function extractCompletionContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;
  return typeof content === "string" ? content : null;
}
