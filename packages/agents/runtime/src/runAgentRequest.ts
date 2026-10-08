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
  model: { default: string };
  prompt: string;
}

/** Options for {@link runAgentRequest}. */
export interface AgentRequestOpts {
  /** Inbound request; only `headers.authorization` is read. */
  request: IncomingRequest;
  agent: AgentConfigLike;
  messages: LlmapiMessage[];
  /** Factories that receive the portal client and return `ToolConfig[]`. */
  toolFactories?: Array<(portalClient: PortalClient) => ToolConfig[]>;
  /** Overrides for the portal client, for test injection. */
  portalClientOpts?: PortalClientOpts;
  /** Streaming transport override forwarded to `runToolLoop`, for tests. */
  transport?: StreamingTransport;
  /** Portal base URL for chat completions; without a stub `transport` this hits the real portal. */
  portalBaseUrl?: string;
  /** LLM API strategy. @defaultValue `"auto"` */
  apiType?: ApiType;
}

/** Token usage lifted off the LLM response. */
export interface UsageSummary {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/** Result of {@link runAgentRequest}. */
export interface AgentResponse {
  /** Input messages, then an assistant `tool_calls` message and tool-result messages when tools ran, then the final assistant message if present. */
  messages: LlmapiMessage[];
  /** Connector errors lifted from tool results. */
  toolErrors: ToolError[];
  usage?: UsageSummary;
  /** Grant context, for logging and tenant propagation. */
  grant: GrantContext;
}

interface ParsedConnectorError {
  __anuma_connector_error_v1: true;
  code: string;
  provider?: string;
  missing_scopes?: string[];
  required?: string;
}

function isConnectorErrorPayload(value: unknown): value is ParsedConnectorError {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>)[CONNECTOR_ERROR_MARKER] === true;
}

/** Lift tool results carrying the `__anuma_connector_error_v1` marker into structured `ToolError`s. */
export function extractConnectorToolErrors(
  toolResults: AutoExecutedToolResult[] | undefined
): ToolError[] {
  if (!toolResults) return [];
  const errors: ToolError[] = [];
  for (let idx = 0; idx < toolResults.length; idx++) {
    const entry = toolResults[idx];
    if (typeof entry.result !== "string") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(entry.result);
    } catch {
      continue;
    }
    if (!isConnectorErrorPayload(parsed)) continue;
    errors.push({
      toolName: entry.name,
      callId: `call_${idx}`,
      error: {
        code: parsed.code,
        provider: parsed.provider,
        missingScopes: parsed.missing_scopes,
        required: parsed.required,
      },
    });
  }
  return errors;
}

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

function finalAssistantMessage(data: unknown): LlmapiMessage | undefined {
  if (!data || typeof data !== "object") return undefined;
  const chatLike = data as LlmapiChatCompletionResponse;
  const chatMsg = chatLike.choices?.[0]?.message;
  if (chatMsg) {
    return {
      role: chatMsg.role,
      content:
        typeof chatMsg.content === "string" ? [{ type: "text", text: chatMsg.content }] : undefined,
      ...(chatMsg.tool_calls ? { tool_calls: chatMsg.tool_calls } : undefined),
    };
  }
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
      const content = typeof tr.result === "string" ? tr.result : (JSON.stringify(tr.result) ?? "");
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

/** Default `requestAccess` for server agents: always throws, since they cannot drive interactive OAuth. */
async function denyInteractive(): Promise<string | null> {
  throw new Error("server agent cannot initiate OAuth; user must connect via portal");
}

/** Handle one inbound agent request: validate the bearer, build the portal client and tools, run `runToolLoop`, and lift connector errors. Throws on transport failure. */
export async function runAgentRequest(opts: AgentRequestOpts): Promise<AgentResponse> {
  const grant = await extractGrantContext(opts.request, opts.portalClientOpts);
  const portal = createPortalClient(grant.bearer, opts.portalClientOpts);

  const tools = (opts.toolFactories ?? []).flatMap((factory) => factory(portal));

  const loopMessages: LlmapiMessage[] = [
    { role: "system", content: [{ type: "text", text: opts.agent.prompt }] },
    ...opts.messages,
  ];

  const loopResult = await runToolLoop({
    messages: loopMessages,
    model: opts.agent.model.default,
    token: grant.bearer,
    tools,
    headers: { "X-Anuma-Surface": "agent", "X-Anuma-Feature": "agent" },
    ...(opts.portalBaseUrl ? { baseUrl: opts.portalBaseUrl } : undefined),
    ...(opts.transport ? { transport: opts.transport } : undefined),
    ...(opts.apiType ? { apiType: opts.apiType } : undefined),
  });

  if (loopResult.error !== null) {
    throw new Error(loopResult.error);
  }

  const finalMessage = finalAssistantMessage(loopResult.data);
  const autoResults = loopResult.autoExecutedToolResults;
  const messages = buildResponseMessages(opts.messages, autoResults, finalMessage);
  const toolErrors = extractConnectorToolErrors(autoResults);
  const usage = extractUsage(loopResult.data);

  return { messages, toolErrors, usage, grant };
}

export { denyInteractive };
