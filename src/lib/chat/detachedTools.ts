import type { LlmapiChatCompletionTool } from "../../client";
import type { StoredMessage } from "../db/chat/types";
import type { ChatBackend } from "../storage/ChatBackend";
import type { AutoExecutedToolResult } from "./toolLoop";
import { buildToolResultContent } from "./toolResultMessage";
import { TOOL_RESULT_ORIGIN } from "./toolResults";
import type { ApiResponse } from "./useChat/strategies/types";
import { getToolCallEvents } from "./useChat/strategies/types";
import type { DetachedToolClass, ToolConfig } from "./useChat/types";
import { executeToolCall } from "./useChat/utils";

/** The tool result the portal writes for a `deferred` call it answered while the device was away. */
export const DEFERRED_TOOL_RESULT = "Done. The user's device applies this when it reconnects.";

type ToolLike = LlmapiChatCompletionTool | ToolConfig;

function toolName(tool: ToolLike): string | undefined {
  const t = tool as { name?: unknown; function?: { name?: unknown } };
  const name = t.function?.name ?? t.name;
  return typeof name === "string" ? name : undefined;
}

/** The detached-turn class of each device tool that has one, keyed by tool name. */
export function detachedToolClasses(
  tools: ToolLike[] | undefined
): Record<string, DetachedToolClass> | undefined {
  const classes: Record<string, DetachedToolClass> = {};
  for (const tool of tools ?? []) {
    const cls = (tool as ToolConfig).detachedClass;
    const name = toolName(tool);
    if (cls && name) classes[name] = cls;
  }
  return Object.keys(classes).length > 0 ? classes : undefined;
}

/** Names of the `render` tools in the list. */
export function renderToolNames(tools: ToolLike[] | undefined): string[] {
  return (tools ?? [])
    .filter((tool) => (tool as ToolConfig).detachedClass === "render")
    .map(toolName)
    .filter((name): name is string => name !== undefined);
}

type PendingCall = { id: string; name: string; arguments: string };

function finalToolCalls(response: ApiResponse): PendingCall[] {
  const r = response as {
    output?: Array<{
      type?: string;
      call_id?: string;
      id?: string;
      name?: string;
      arguments?: string;
    }>;
    choices?: Array<{
      message?: {
        tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
      };
    }>;
  };
  if (Array.isArray(r.output)) {
    const answered = new Set(
      r.output.filter((item) => item?.type === "function_call_output").map((item) => item.call_id)
    );
    return r.output
      .filter((item) => item?.type === "function_call" && item.name)
      .filter((item) => !answered.has(item.call_id ?? item.id))
      .map((item) => ({
        id: item.call_id ?? item.id ?? "",
        name: item.name ?? "",
        arguments: item.arguments ?? "{}",
      }));
  }
  return (r.choices?.[0]?.message?.tool_calls ?? [])
    .filter((call) => call.function?.name)
    .map((call) => ({
      id: call.id ?? "",
      name: call.function?.name ?? "",
      arguments: call.function?.arguments ?? "{}",
    }));
}

function deferredToolCalls(response: ApiResponse): PendingCall[] {
  return (getToolCallEvents(response) ?? [])
    .filter((event) => event.output === DEFERRED_TOOL_RESULT && event.name)
    .map((event) => ({
      id: event.id ?? "",
      name: event.name ?? "",
      arguments: event.arguments ?? "{}",
    }));
}

/** Runs a detached answer's unanswered `render` calls and the `deferred` calls the portal answered. */
export async function runDetachedToolCalls(
  response: ApiResponse,
  tools: ToolConfig[] | undefined,
  deAnonymize?: (text: string) => string
): Promise<AutoExecutedToolResult[]> {
  if (!tools?.length) return [];
  const byName = new Map<string, ToolConfig>();
  for (const tool of tools) {
    const name = toolName(tool);
    if (name && tool.detachedClass && tool.executor) byName.set(name, tool);
  }
  const calls = [
    ...deferredToolCalls(response).filter(
      (call) => byName.get(call.name)?.detachedClass === "deferred"
    ),
    ...finalToolCalls(response).filter((call) => byName.get(call.name)?.detachedClass === "render"),
  ];
  const seen = new Set<string>();
  const results: AutoExecutedToolResult[] = [];
  for (const call of calls) {
    const tool = byName.get(call.name);
    if (!tool?.executor || seen.has(call.id)) continue;
    seen.add(call.id);
    const args = deAnonymize && tool.deAnonymizeArgs ? deAnonymize(call.arguments) : call.arguments;
    const { result, error } = await executeToolCall(
      { id: call.id, type: "function", name: call.name, arguments: args, status: "pending" },
      tool.executor,
      tool.executorTimeout,
      undefined,
      { detached: true }
    );
    results.push({ name: call.name, result: error !== undefined ? { error } : result });
  }
  return results;
}

/** Runs a stored detached answer's device-side calls once, saving their results as its tool-results row. */
export async function storeDetachedToolResults(options: {
  backend: Pick<ChatBackend, "createMessage" | "getMessagesByIds">;
  answer: StoredMessage;
  response: ApiResponse;
  tools: ToolConfig[] | undefined;
  deAnonymize?: (text: string) => string;
}): Promise<StoredMessage | null> {
  const { backend, answer, response, tools, deAnonymize } = options;
  const rowId = `${answer.uniqueId}_tool_results`;
  const [existing] = await backend.getMessagesByIds([rowId]);
  if (existing) return existing;
  const results = await runDetachedToolCalls(response, tools, deAnonymize);
  if (results.length === 0) return null;
  return backend.createMessage({
    uniqueId: rowId,
    conversationId: answer.conversationId,
    role: "user",
    content: buildToolResultContent(results),
    model: "",
    parentMessageId: answer.uniqueId,
    origin: TOOL_RESULT_ORIGIN,
  });
}
