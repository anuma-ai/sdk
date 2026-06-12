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
  const baseUrl = req.baseUrl ?? defaultBaseUrl();
  const fetchImpl = req.fetchFn ?? fetch;
  const timeoutMs = req.timeoutMs ?? 60_000;

  const authHeaders = await resolvePortalAuthHeaders(req, req.tag);
  if (authHeaders === null) return null;

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: req.model,
        messages,
        response_format: { type: "json_object" },
        ...req.extra,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    log.warn(`[${req.tag}] fetch failed`, err);
    return null;
  }

  if (!response.ok) {
    clearTimeout(timer);
    log.warn(`[${req.tag}] portal returned`, response.status);
    return null;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    clearTimeout(timer);
    log.warn(`[${req.tag}] response body parse failed`, err);
    return null;
  }
  clearTimeout(timer);

  const rawContent = extractCompletionContent(body);
  if (!rawContent) {
    log.warn(`[${req.tag}] portal response had no completion content`);
    return null;
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
  try {
    return JSON.parse(candidate);
  } catch (err) {
    log.warn(`[${req.tag}] completion was not valid JSON`, err);
    return null;
  }
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
