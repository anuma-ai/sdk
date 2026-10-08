import { BASE_URL } from "../../clientConfig.js";
import { validateEndpointOverride } from "../chat/endpointOverride.js";
import { withInternalFlowMarker } from "../internalFlowMarker.js";
import { getLogger } from "../logger.js";
import { type TaskType, taskTypeHeader } from "../taskType.js";

function defaultBaseUrl(): string {
  return (typeof process !== "undefined" && process.env?.ANUMA_PORTAL_BASE_URL) || BASE_URL;
}

const RESPONSE_FORMAT_OK = new Set(["openai", "inclusionai", "deepseek"]);

const RESPONSE_SCHEMA_OK = new Set(["openai"]);

const JSON_CONTRACT_REMINDER =
  "Output ONLY the strict JSON object requested. No prose, no explanation, no markdown.";

/**
 * Whether `model` accepts an OpenAI-style `response_format` request field. Use
 * this to gate the flag on any direct portal `/chat/completions` call so models
 * that 400 on it (e.g. Cerebras gpt-oss) or silently ignore it (Anthropic)
 * never receive it.
 *
 * `variant` distinguishes the two shapes — `"json_object"` (the default,
 * broadly supported) vs `"json_schema"` (OpenAI structured outputs, a strict
 * subset). A model that takes json_object but not json_schema must NOT be sent
 * the latter, or it 400s; pass the variant the caller actually intends to send.
 *
 * Match on path SEGMENTS, not a raw substring: model ids are `provider/model`
 * (or proxied `openrouter/openai/model`), so splitting on `/` matches `openai`
 * in both `openai/x` and `openrouter/openai/x` without a coincidental id like
 * `someprovider-openai/x` wrongly qualifying.
 */
export function supportsResponseFormat(
  model: string,
  variant: "json_object" | "json_schema" = "json_object"
): boolean {
  const allow = variant === "json_schema" ? RESPONSE_SCHEMA_OK : RESPONSE_FORMAT_OK;
  return model.split("/").some((seg) => allow.has(seg));
}

const RESPONSES_ONLY_MODEL_PREFIXES = ["gpt-5.6", "gpt-6-sol", "gpt-6-luna", "gpt-6-astra"];

/**
 * Whether `model` must be called on the Responses transport.
 *
 * {@link callPortalJsonCompletion} consults it to pick the DEFAULT transport
 * when the caller sets none (an explicit `transport` still wins), and a caller
 * that hand-rolls its own portal fetch (today: `reflect`) uses it to pick the
 * endpoint and the body shape.
 */
export function requiresResponsesTransport(model: string): boolean {
  return model
    .split("/")
    .some((seg) => RESPONSES_ONLY_MODEL_PREFIXES.some((prefix) => seg.startsWith(prefix)));
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

/**
 * Why a portal JSON completion gave up, as a STABLE low-cardinality code.
 *
 * The retry loop has always classified its failures precisely, but only as an
 * interpolated `reason` string for `log.warn` — and prod ships no SDK log
 * (sdk#883), so in production every one of these collapsed into a single
 * `empty-after-retry` with no way to tell them apart. That is what made the
 * 2026-08-11 audit need a Prometheus cross-check to discover that the portal
 * was returning HTTP 200 with an empty body on ~60% of extraction turns.
 *
 * Codes are deliberately an enum, not the `reason` string: the strings embed
 * status codes and error messages, so they are unbounded and useless as an
 * analytics property. Keep this list SHORT and stable — it is a telemetry
 * contract, and a value added here has to mean the same thing in six months.
 *
 * @public
 */
export type PortalLlmFailureReason =
  /** No usable credential — `getToken` returned null or threw. Terminal. */
  | "auth-unavailable"
  /** Non-retryable HTTP status (400/403/404, or 401 on the static-apiKey path). */
  | "http-terminal"
  /** Retryable status (408/409/425/429/5xx) that never succeeded. */
  | "http-retryable"
  /** Network error or the per-attempt timeout aborted the fetch. */
  | "network"
  /** HTTP 200 but the envelope itself wasn't JSON. */
  | "body-parse-failed"
  /**
   * HTTP 200 with NO completion content. The reasoning-class failure mode:
   * the model spends its budget on unreturned thinking and answers empty.
   */
  | "empty-content"
  /** Content present, but no parseable JSON in it (prose, a clarifying question). */
  | "invalid-json"
  /** Content parsed to a literal `null`, which is never a valid response. */
  | "null-completion"
  /** `totalTimeoutMs` was spent before the next attempt could run. */
  | "time-budget-exhausted"
  /**
   * The portal's moderation gate refused the request. Terminal: the same input
   * is flagged again on every retry. See {@link isModerationResponse}.
   */
  | "content-flagged";

/**
 * One attempt of a {@link callPortalJsonCompletion} call, reported to
 * `onAttempt` as it settles — success included. The wire-level diagnostic the
 * give-up hook cannot provide: a call that succeeds on its third try returns a
 * value and fires no `onFailure`, yet it cost three completions and its first
 * two answers were unusable. Extraction quality regressions have hidden in
 * exactly that shape (a prompt change that made the model answer `NONE` first,
 * JSON on retry), so the extraction eval gates on the first-attempt clean rate.
 *
 * @public
 */
export interface PortalLlmAttempt {
  /** 1-based attempt index. */
  attempt: number;
  /** Whether this attempt produced a parseable JSON value. */
  ok: boolean;
  /** Classification when `ok` is false. */
  reason?: PortalLlmFailureReason;
  httpStatus?: number;
}

/**
 * A give-up report: the classified {@link PortalLlmFailureReason} plus the
 * little context worth carrying into telemetry. Both extra fields are bounded
 * (a status code, a small attempt count), so both are safe as event properties.
 *
 * @public
 */
export interface PortalLlmFailure {
  /** Stable code for the last failure observed. */
  reason: PortalLlmFailureReason;
  /** HTTP status, when the failure was an HTTP one. */
  httpStatus?: number;
  /** How many attempts ran before giving up (1-based, ≥ 1). */
  attempts: number;
}

type PortalLlmTransport = "chat" | "responses";

type PortalLlmTransportOptions =
  | {
      transport?: Extract<PortalLlmTransport, "chat">;
      reasoning?: never;
    }
  | {
      transport: Extract<PortalLlmTransport, "responses">;
      reasoning?: { effort: "low" | "medium" | "high" };
    };

interface PortalLlmRequestBase extends PortalLlmAuth {
  baseUrl?: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  tag: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  extra?: Record<string, unknown>;
  maxAttempts?: number;
  totalTimeoutMs?: number;
  backoffMs?: (attempt: number) => number;
  endpointOverride?: string;
  taskType?: TaskType;
  onFailure?: (failure: PortalLlmFailure) => void;
  onAttempt?: (attempt: PortalLlmAttempt) => void;
  reinforceJsonContract?: boolean;
}

type PortalLlmRequest = PortalLlmRequestBase & PortalLlmTransportOptions;

const CHAT_TO_RESPONSES_FIELDS: Record<string, string> = {
  max_completion_tokens: "max_output_tokens",
};

function responsesExtra(extra: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!extra) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    const target = CHAT_TO_RESPONSES_FIELDS[key] ?? key;
    if (target !== key && target in extra) continue;
    out[target] = value;
  }
  return out;
}

function splitEndpoint(endpoint: string): { path: string; rest: string } {
  const cut = endpoint.search(/[?#]/);
  const rawPath = cut === -1 ? endpoint : endpoint.slice(0, cut);
  return {
    path: rawPath.replace(/\/+$/, ""),
    rest: cut === -1 ? "" : endpoint.slice(cut),
  };
}

const FOREIGN_ENDPOINT_SUFFIX: Record<PortalLlmTransport, string> = {
  chat: "/responses",
  responses: "/chat/completions",
};

function assertTransportMatchesEndpoint(transport: PortalLlmTransport, endpoint: string): void {
  const foreign = FOREIGN_ENDPOINT_SUFFIX[transport];
  if (!splitEndpoint(endpoint).path.endsWith(foreign)) return;
  throw new Error(
    `endpointOverride "${endpoint}" is the other transport's endpoint, but transport is ` +
      `"${transport}". The request body is built for the transport, so this sends the ` +
      `wrong shape and 400s without retry.`
  );
}

type AttemptOutcome =
  | { kind: "ok"; value: unknown }
  | {
      kind: "retryable";
      code: PortalLlmFailureReason;
      reason: string;
      retryAfterMs?: number;
      httpStatus?: number;
    }
  | { kind: "terminal"; code: PortalLlmFailureReason; reason: string; httpStatus?: number };

const RETRYABLE_HTTP = new Set([408, 409, 425, 429]);

function isRetryableStatus(status: number): boolean {
  return status >= 500 || RETRYABLE_HTTP.has(status);
}

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
  const transport: PortalLlmTransport =
    req.transport ?? (requiresResponsesTransport(req.model) ? "responses" : "chat");
  const autoUpgraded = req.transport === undefined && transport === "responses";
  let endpoint = transport === "responses" ? "/api/v1/responses" : "/api/v1/chat/completions";
  if (req.endpointOverride !== undefined) {
    const overrideValidation = validateEndpointOverride(req.endpointOverride);
    if (!overrideValidation.valid) {
      throw new Error(overrideValidation.message);
    }
    endpoint = overrideValidation.endpoint;
    const { path, rest } = splitEndpoint(endpoint);
    if (autoUpgraded && path.endsWith("/chat/completions")) {
      endpoint = `${path.slice(0, -"/chat/completions".length)}/responses${rest}`;
    }
    assertTransportMatchesEndpoint(transport, endpoint);
  }
  const maxAttempts = Math.max(1, req.maxAttempts ?? 3);
  const startedAt = Date.now();
  const overBudget = () =>
    req.totalTimeoutMs !== undefined && Date.now() - startedAt >= req.totalTimeoutMs;

  let lastFailure: PortalLlmFailure | undefined;
  let reinforce = false;
  const giveUp = (): null => {
    req.onFailure?.(lastFailure ?? { reason: "network", attempts: maxAttempts });
    return null;
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1 && overBudget()) {
      log.warn(`[${req.tag}] over time budget before attempt ${attempt}, giving up`);
      lastFailure = { reason: "time-budget-exhausted", attempts: attempt - 1 };
      break;
    }
    const attemptReq =
      req.totalTimeoutMs !== undefined
        ? {
            ...req,
            timeoutMs: Math.max(
              1,
              Math.min(req.timeoutMs ?? 60_000, req.totalTimeoutMs - (Date.now() - startedAt))
            ),
            ...(reinforce && { reinforceJsonContract: true }),
          }
        : reinforce
          ? { ...req, reinforceJsonContract: true }
          : req;
    const outcome = await attemptPortalJson(
      { ...attemptReq, transport } as PortalLlmRequest,
      endpoint
    );
    if (outcome.kind === "ok") {
      req.onAttempt?.({ attempt, ok: true });
      return outcome.value;
    }
    req.onAttempt?.({
      attempt,
      ok: false,
      reason: outcome.code,
      ...(outcome.httpStatus !== undefined && { httpStatus: outcome.httpStatus }),
    });
    lastFailure = {
      reason: outcome.code,
      ...(outcome.httpStatus !== undefined && { httpStatus: outcome.httpStatus }),
      attempts: attempt,
    };
    if (outcome.code === "invalid-json" || outcome.code === "null-completion") reinforce = true;
    if (outcome.kind === "terminal") {
      log.warn(`[${req.tag}] ${outcome.reason}`);
      return giveUp();
    }
    if (attempt >= maxAttempts) {
      log.warn(`[${req.tag}] ${outcome.reason} — attempt ${attempt}/${maxAttempts}, giving up`);
      break;
    }
    const backoff = (req.backoffMs ?? defaultBackoffMs)(attempt);
    const delay = Math.max(backoff, outcome.retryAfterMs ?? 0);
    if (
      overBudget() ||
      (req.totalTimeoutMs !== undefined && Date.now() - startedAt + delay >= req.totalTimeoutMs)
    ) {
      log.warn(
        `[${req.tag}] ${outcome.reason} — attempt ${attempt}/${maxAttempts}, over time budget, giving up`
      );
      lastFailure = { reason: "time-budget-exhausted", attempts: attempt };
      break;
    }
    log.warn(`[${req.tag}] ${outcome.reason} — attempt ${attempt}/${maxAttempts}, retrying`);
    if (delay > 0) await sleep(delay);
  }
  return giveUp();
}

async function attemptPortalJson(req: PortalLlmRequest, endpoint: string): Promise<AttemptOutcome> {
  const baseUrl = req.baseUrl ?? defaultBaseUrl();
  const fetchImpl = req.fetchFn ?? fetch;
  const timeoutMs = req.timeoutMs ?? 60_000;

  const authHeaders = await resolvePortalAuthHeaders(req, req.tag);
  if (authHeaders === null)
    return { kind: "terminal", code: "auth-unavailable", reason: "auth unavailable (no token)" };

  const usesPrefill = req.transport !== "responses" && req.model.startsWith("anthropic/");
  const prefill = usesPrefill ? "{" : "";
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: withInternalFlowMarker(req.systemPrompt) },
    ...(req.reinforceJsonContract
      ? [{ role: "system" as const, content: JSON_CONTRACT_REMINDER }]
      : []),
    { role: "user", content: req.userMessage },
  ];
  if (prefill) messages.push({ role: "assistant", content: prefill });

  const supportsJsonObjectFormat = supportsResponseFormat(req.model);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const requestBody: Record<string, unknown> =
    req.transport === "responses"
      ? {
          model: req.model,
          input: messages,
          ...(req.reasoning && { reasoning: req.reasoning }),
          ...responsesExtra(req.extra),
        }
      : {
          model: req.model,
          messages,
          ...(supportsJsonObjectFormat && { response_format: { type: "json_object" } }),
          ...req.extra,
        };
  if (req.transport === "responses" || !supportsJsonObjectFormat) {
    delete requestBody.response_format;
  }

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        ...authHeaders,
        ...taskTypeHeader(req.taskType),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    return {
      kind: "retryable",
      code: "network",
      reason: `fetch failed: ${(err as Error).message}`,
    };
  }

  if (!response.ok) {
    clearTimeout(timer);
    const reason = `portal returned ${response.status}`;
    if (response.status === 401) {
      const tokenAuth = !req.apiKey && !!req.getToken;
      return tokenAuth
        ? {
            kind: "retryable",
            code: "http-retryable",
            reason: `${reason} (token may be expired; refreshing)`,
            httpStatus: response.status,
          }
        : { kind: "terminal", code: "http-terminal", reason, httpStatus: response.status };
    }
    if (!isRetryableStatus(response.status))
      return { kind: "terminal", code: "http-terminal", reason, httpStatus: response.status };
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    return {
      kind: "retryable",
      code: "http-retryable",
      reason,
      httpStatus: response.status,
      ...(retryAfterMs !== null && { retryAfterMs }),
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    clearTimeout(timer);
    return {
      kind: "retryable",
      code: "body-parse-failed",
      reason: `response body parse failed: ${(err as Error).message}`,
    };
  }
  clearTimeout(timer);

  logPortalUsage(body, req.tag);

  if (isModerationResponse(body)) {
    return {
      kind: "terminal",
      code: "content-flagged",
      reason: "portal moderation refused the request",
    };
  }

  const rawContent = extractCompletionContent(body);
  if (!rawContent) {
    return {
      kind: "retryable",
      code: "empty-content",
      reason: "portal response had no completion content",
    };
  }

  const looksLikeContinuation = prefill && /^\s*"/.test(rawContent);
  const content = looksLikeContinuation ? prefill + rawContent : rawContent;

  const candidate = extractJsonCandidate(content);
  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch (err) {
    return {
      kind: "retryable",
      code: "invalid-json",
      reason: `completion was not valid JSON: ${(err as Error).message}`,
    };
  }
  if (value === null) {
    return { kind: "retryable", code: "null-completion", reason: "completion parsed to null" };
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
export function extractJsonCandidate(raw: string): string {
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function logPortalUsage(body: unknown, tag: string): void {
  try {
    const root = asRecord(body);
    if (!root) return;
    const usage = asRecord(root.usage);
    const promptTokens = asCount(usage?.prompt_tokens) ?? asCount(usage?.input_tokens);
    const completionTokens = asCount(usage?.completion_tokens) ?? asCount(usage?.output_tokens);
    if (promptTokens === undefined && completionTokens === undefined) return;
    const cachedTokens =
      asCount(asRecord(root.portal)?.cached_tokens) ??
      asCount(asRecord(usage?.prompt_tokens_details)?.cached_tokens) ??
      asCount(asRecord(usage?.input_tokens_details)?.cached_tokens) ??
      0;
    const reasoningTokens =
      asCount(asRecord(usage?.output_tokens_details)?.reasoning_tokens) ??
      asCount(asRecord(usage?.completion_tokens_details)?.reasoning_tokens);
    const parts: string[] = [];
    if (promptTokens !== undefined) parts.push(`prompt=${promptTokens}`);
    if (completionTokens !== undefined) parts.push(`completion=${completionTokens}`);
    if (reasoningTokens !== undefined) parts.push(`reasoning=${reasoningTokens}`);
    parts.push(`cached=${cachedTokens}`);
    getLogger().debug(`[${tag}] usage ${parts.join(" ")}`);
  } catch {
    // ignored — see above
  }
}

function isModerationResponse(body: unknown): boolean {
  return (
    typeof body === "object" && body !== null && (body as { id?: unknown }).id === "moderation"
  );
}

export function extractCompletionContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  const responsesText = extractResponsesContent(body);
  if (responsesText !== null) return responsesText;

  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;
  return typeof content === "string" ? content : null;
}

function extractResponsesContent(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;
  if (typeof root.output_text === "string" && root.output_text !== "") return root.output_text;
  if (!Array.isArray(root.output)) return null;
  const text = root.output
    .filter((item): item is Record<string, unknown> => asRecord(item)?.type === "message")
    .flatMap((item): unknown[] => (Array.isArray(item.content) ? (item.content as unknown[]) : []))
    .map((part) => asRecord(part)?.text)
    .filter((t): t is string => typeof t === "string")
    .join("");
  return text;
}
