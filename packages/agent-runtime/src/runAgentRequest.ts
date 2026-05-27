/**
 * `runAgentRequest` — the single function a server-side agent host calls
 * per inbound request.
 *
 * Wires the four pieces together:
 *   extractGrantContext → createPortalClient → toolFactories → runToolLoop
 *
 * After the loop returns, walks the auto-executed tool results, lifts any
 * payload carrying the canonical `__anuma_connector_error_v1` marker into
 * `AgentResponse.toolErrors`. The marker shape is the load-bearing contract
 * — every connector tool factory uses `buildConnectorErrorResult` to emit
 * it, and the parser keys solely on that marker so it can't false-positive
 * on tools that legitimately return JSON.
 */

import type {
  LlmapiChatCompletionResponse,
  LlmapiMessage,
  LlmapiResponseResponse,
} from "@anuma/sdk";
import {
  type ApiType,
  type AutoExecutedToolResult,
  runToolLoop,
  type StreamingTransport,
  type ToolConfig,
} from "@anuma/sdk/server";
import { CONNECTOR_ERROR_MARKER } from "@anuma/sdk/tools";

import { createPortalClient } from "./createPortalClient.js";
import { extractGrantContext } from "./extractGrantContext.js";
import type {
  GrantContext,
  IncomingRequest,
  PortalClient,
  PortalClientOpts,
  ToolError,
} from "./types.js";

/** Minimal slice of `AgentConfig` this runtime depends on. */
export interface AgentConfigLike {
  /** Model selection — at least `default` must be present. */
  model: { default: string };
  /** System prompt threaded into the loop. */
  prompt: string;
}

export interface AgentRequestOpts {
  /** Inbound request — only `headers.authorization` is read. */
  request: IncomingRequest;
  /** Agent configuration (haven, sentinel, …). */
  agent: AgentConfigLike;
  /** Conversation history including the user turn. */
  messages: LlmapiMessage[];
  /** Tool factories that receive the portal client and return `ToolConfig[]`. */
  toolFactories?: Array<(portalClient: PortalClient) => ToolConfig[]>;
  /** Override portal client opts (test injection). */
  portalClientOpts?: PortalClientOpts;
  /**
   * Override the streaming transport runToolLoop uses to talk to the
   * portal's chat completion API. Production code never sets this — it's
   * the injection point e2e tests use to stub LLM behavior without a real
   * portal in the loop. Forwarded verbatim to runToolLoop's
   * `transport` option.
   */
  transport?: StreamingTransport;
  /**
   * Optional portal base URL forwarded to runToolLoop for chat completions.
   * Defaults to runToolLoop's own default. Setting this without a stub
   * `transport` will hit the real portal.
   */
  portalBaseUrl?: string;
  /**
   * Optional override for the LLM API strategy ("responses" | "completions" | "auto").
   * Production callers don't set this — the default ("auto") picks the right
   * endpoint for the model. Tests use "completions" with the stub transport
   * to feed OpenAI-style streaming chunks.
   */
  apiType?: ApiType;
}

/** Minimal usage summary lifted off the LLM response. */
export interface UsageSummary {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AgentResponse {
  /**
   * Conversation messages after the loop completes: the input messages,
   * followed by tool-result messages for each auto-executed tool, followed
   * by the final assistant message. Synthesized — `runToolLoop` doesn't
   * expose the full message history directly.
   */
  messages: LlmapiMessage[];
  /** Structured tool errors lifted from the post-loop parser. */
  toolErrors: ToolError[];
  /** Token usage summary if the response carried one. */
  usage?: UsageSummary;
  /** Grant context, surfaced for logging / multi-tenant context propagation. */
  grant: GrantContext;
}

interface ParsedConnectorError {
  __anuma_connector_error_v1: true;
  code: string;
  provider?: string;
  connect_url?: string;
  missing_scopes?: string[];
  required?: string;
}

function isConnectorErrorPayload(value: unknown): value is ParsedConnectorError {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>)[CONNECTOR_ERROR_MARKER] === true;
}

/**
 * Walk the loop's tool results, lift entries that carry the
 * `__anuma_connector_error_v1` marker into structured `ToolError`s.
 *
 * Each `AutoExecutedToolResult.result` is what the executor returned.
 * Connector tool factories return the JSON string produced by
 * `buildConnectorErrorResult`, so we JSON.parse strings and inspect for
 * the marker. Non-string results (objects, arrays, errors) skip the
 * parser entirely — they can't be connector errors.
 */
export function extractConnectorToolErrors(
  toolResults: AutoExecutedToolResult[] | undefined
): ToolError[] {
  if (!toolResults) return [];
  const errors: ToolError[] = [];
  for (const entry of toolResults) {
    if (typeof entry.result !== "string") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(entry.result);
    } catch {
      // Not JSON — not our error.
      continue;
    }
    if (!isConnectorErrorPayload(parsed)) continue;
    errors.push({
      toolName: entry.name,
      callId: "",
      error: {
        code: parsed.code,
        provider: parsed.provider,
        connectUrl: parsed.connect_url,
        missingScopes: parsed.missing_scopes,
        required: parsed.required,
      },
    });
  }
  return errors;
}

/** Pull a usage summary off either OpenAI-shape or Responses-shape responses. */
function extractUsage(data: unknown): UsageSummary | undefined {
  if (!data || typeof data !== "object") return undefined;
  const usage = (data as { usage?: Record<string, unknown> }).usage;
  if (!usage) return undefined;
  const input =
    typeof usage.prompt_tokens === "number"
      ? usage.prompt_tokens
      : typeof usage.input_tokens === "number"
        ? usage.input_tokens
        : undefined;
  const output =
    typeof usage.completion_tokens === "number"
      ? usage.completion_tokens
      : typeof usage.output_tokens === "number"
        ? usage.output_tokens
        : undefined;
  const total = typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;
  if (input === undefined && output === undefined && total === undefined) return undefined;
  return { inputTokens: input, outputTokens: output, totalTokens: total };
}

/** Pull the final assistant message off the chat-completion or responses payload. */
function finalAssistantMessage(data: unknown): LlmapiMessage | undefined {
  if (!data || typeof data !== "object") return undefined;
  const chatLike = data as LlmapiChatCompletionResponse;
  const chatMsg = chatLike.choices?.[0]?.message;
  if (chatMsg) return chatMsg;
  // Fall back to Responses-API shape (best-effort).
  const resp = data as LlmapiResponseResponse;
  const output = resp.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const message = (item as { message?: LlmapiMessage }).message;
      if (message) return message;
    }
  }
  return undefined;
}

/**
 * Synthesize the post-loop messages array.
 *
 * Order: input messages → assistant `tool_calls` placeholder + tool-role
 * results for each auto-executed tool → final assistant message. The
 * placeholder assistant message is needed because OpenAI-shape tools
 * expect a tool-role message to follow an assistant message that
 * declared the call; the post-loop consumer only needs to read the
 * tool results, so we keep it minimal.
 */
function buildResponseMessages(
  inputMessages: LlmapiMessage[],
  toolResults: AutoExecutedToolResult[] | undefined,
  finalMessage: LlmapiMessage | undefined
): LlmapiMessage[] {
  const out: LlmapiMessage[] = [...inputMessages];
  if (toolResults && toolResults.length > 0) {
    out.push({
      role: "assistant",
      tool_calls: toolResults.map((tr, idx) => ({
        id: `call_${idx}`,
        type: "function",
        function: { name: tr.name, arguments: "{}" },
      })),
    });
    for (let idx = 0; idx < toolResults.length; idx++) {
      const tr = toolResults[idx];
      const content = typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result);
      out.push({
        role: "tool",
        tool_call_id: `call_${idx}`,
        content: [{ type: "text", text: content }],
      } as LlmapiMessage);
    }
  }
  if (finalMessage) out.push(finalMessage);
  return out;
}

/**
 * Default `requestAccess` passed to connector tool factories from inside
 * `runAgentRequest`. Server agents cannot drive interactive OAuth — they
 * have no surface to bounce the user through. The factory falls back to
 * emitting the canonical connector error JSON when this throws.
 */
async function denyInteractive(): Promise<string | null> {
  throw new Error("server agent cannot initiate OAuth; user must connect via portal");
}

export async function runAgentRequest(opts: AgentRequestOpts): Promise<AgentResponse> {
  const grant = await extractGrantContext(opts.request, opts.portalClientOpts);
  const portal = createPortalClient(grant.bearer, opts.portalClientOpts);

  const tools = (opts.toolFactories ?? []).flatMap((factory) => factory(portal));

  const loopResult = await runToolLoop({
    messages: opts.messages,
    model: opts.agent.model.default,
    token: grant.bearer,
    tools,
    headers: { "X-Anuma-Surface": "agent" },
    ...(opts.portalBaseUrl ? { baseUrl: opts.portalBaseUrl } : undefined),
    ...(opts.transport ? { transport: opts.transport } : undefined),
    ...(opts.apiType ? { apiType: opts.apiType } : undefined),
  });

  if (loopResult.error !== null) {
    // Surface transport-level failures by throwing — consumer maps to 5xx.
    throw new Error(loopResult.error);
  }

  const finalMessage = finalAssistantMessage(loopResult.data);
  // `autoExecutedToolResults` lives on the success branch of the
  // discriminated union; narrowed above by the `error !== null` guard.
  const autoResults = loopResult.autoExecutedToolResults;
  const messages = buildResponseMessages(opts.messages, autoResults, finalMessage);
  const toolErrors = extractConnectorToolErrors(autoResults);
  const usage = extractUsage(loopResult.data);

  return { messages, toolErrors, usage, grant };
}

// `denyInteractive` is exported so consumers writing custom tool factories
// can apply the same no-OAuth-on-server policy without re-implementing it.
export { denyInteractive };
