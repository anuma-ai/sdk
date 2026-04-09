import type {
  LlmapiChatCompletionTool,
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiThinkingOptions,
  LlmapiToolCall,
} from "../../client";
import { createSseClient } from "../../client/core/serverSentEvents.gen";
import { BASE_URL } from "../../clientConfig";

/**
 * Error thrown when the SSE connection receives a non-OK HTTP response.
 * Preserves the HTTP status code for programmatic error handling.
 */
class SseError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "SseError";
    this.statusCode = statusCode;
  }
}

function parseStatusCode(message: string): number | undefined {
  const match = message.match(/^SSE failed: (\d+) /);
  return match ? Number(match[1]) : undefined;
}

function wrapSseError(error: unknown): Error {
  if (error instanceof Error) {
    const statusCode = parseStatusCode(error.message);
    if (statusCode !== undefined) {
      return new SseError(statusCode, error.message);
    }
    return error;
  }
  return new Error(String(error));
}
import { getStrategy, resolveApiType } from "./useChat/strategies";
import type { ApiResponse, ApiType } from "./useChat/strategies/types";
import type { StreamSmoothingConfig } from "./useChat/StreamSmoother";
import { StreamSmoother } from "./useChat/StreamSmoother";
import type { AccumulatedToolCall, ToolConfig } from "./useChat/types";
import type {
  ServerToolCallEvent,
  ToolCallArgumentsDeltaEvent,
  ToolExecutionErrorType,
} from "./useChat/utils";
import {
  createStreamAccumulator,
  createToolExecutorMap,
  executeToolCall,
  isAbortError,
  isDoneMarker,
  safeJsonStringify,
  toolsToApiFormat,
  validateMessages,
  validateModel,
} from "./useChat/utils";

const MAX_TOOL_ITERATIONS = 10;
const CONNECTOR_PREFIXES = ["notion-", "google_calendar_", "google_drive_"];

/** Extract tool name from either nested (function.name) or flat (name) format. */
function getToolName(tool: Record<string, unknown>): string | undefined {
  const func = tool.function as Record<string, unknown> | undefined;
  const nestedName = func?.name;
  if (typeof nestedName === "string") return nestedName;
  const flatName = tool.name;
  if (typeof flatName === "string") return flatName;
  return undefined;
}

/** A tool result from an auto-executed tool. */
export type AutoExecutedToolResult = {
  name: string;
  result: unknown;
};

/** Information emitted after each tool execution round completes. */
export type StepFinishEvent = {
  /** 1-based index of this tool round. */
  stepIndex: number;
  /** Text content the model produced in this round (may be empty if the model only called tools). */
  content: string;
  /** Tool calls the model made in this round. */
  toolCalls: Array<{ name: string; arguments: string }>;
  /** Results from auto-executed tools in this round. */
  toolResults: Array<{
    name: string;
    result: unknown;
    error?: string;
    errorType?: ToolExecutionErrorType;
  }>;
  /** Token usage for this round, if available. */
  usage: { inputTokens?: number; outputTokens?: number };
};

/**
 * Options for `runToolLoop`.
 */
export type RunToolLoopOptions = {
  /** Messages to send to the model. */
  messages: LlmapiMessage[];
  /** Model identifier (e.g. "gpt-4o", "anthropic/claude-3-7-sonnet-20250219"). */
  model: string;
  /** Bearer token for the Portal API. Omit when using API-key auth via `headers`. */
  token?: string;
  /** Base URL for the Portal API. @default "https://portal.anuma-dev.ai" */
  baseUrl?: string;
  /** Additional headers to include with each request. */
  headers?: Record<string, string>;
  /** Which API backend to use. @default "auto" */
  apiType?: ApiType;
  /** Controls randomness (0.0 to 2.0). */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxOutputTokens?: number;
  /** Tool definitions, optionally with executors for auto-execution. */
  tools?: Array<LlmapiChatCompletionTool | ToolConfig>;
  /** Controls which tool to use: "auto", "any", "none", "required", or a specific tool name. */
  toolChoice?: string;
  /**
   * Maximum tool execution rounds before forcing the model to respond with text.
   * After this many rounds, `toolChoice` is set to `"none"`.
   * @default 3
   */
  maxToolRounds?: number;
  /** Reasoning configuration for o-series models. */
  reasoning?: LlmapiResponseReasoning;
  /** Extended thinking configuration for Anthropic models. */
  thinking?: LlmapiThinkingOptions;
  /** User-selected image generation model. */
  imageModel?: string;
  /** Groups requests belonging to the same conversation for observability. Pass-through only — not forwarded to the LLM provider. */
  conversationId?: string;
  /** Controls adaptive output smoothing for streaming. @default true */
  smoothing?: StreamSmoothingConfig | boolean;
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;
  /** Called with content text deltas as they stream. */
  onData?: (chunk: string) => void;
  /** Called with thinking/reasoning deltas as they stream. */
  onThinking?: (chunk: string) => void;
  /** Called when the completion finishes successfully. */
  onFinish?: (response: ApiResponse) => void;
  /** Called when an unexpected error occurs (not called for aborts). */
  onError?: (error: Error) => void;
  /** Called for tool calls that don't have an executor (e.g. server-side tools). */
  onToolCall?: (toolCall: LlmapiToolCall) => void;
  /** Called when a server-side tool (MCP) is invoked during streaming. */
  onServerToolCall?: (toolCall: ServerToolCallEvent) => void;
  /**
   * Called after each tool execution round completes.
   * Receives the round index, model content, tool calls, results, and usage.
   */
  onStepFinish?: (event: StepFinishEvent) => void;
  /**
   * Called with partial tool call arguments as they stream in.
   * Use for live preview of artifacts (HTML, slides) being generated.
   */
  onToolCallArgumentsDelta?: (event: ToolCallArgumentsDeltaEvent) => void;
  /**
   * Custom streaming transport. Defaults to a fetch-based SSE client.
   * React Native environments can supply an XHR-based transport since
   * `fetch` response body streaming isn't available in RN.
   */
  transport?: StreamingTransport;
  /**
   * Maximum number of connector tool calls (notion, google calendar, google drive)
   * before they are removed from subsequent rounds. Set to `Infinity` to disable.
   * Only applies to fast models (cerebras) by default.
   * @default 2
   */
  maxConnectorCalls?: number;
};

export type RunToolLoopResult =
  | {
      data: ApiResponse;
      error: null;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
      /** Results from tools that were auto-executed by the SDK */
      autoExecutedToolResults?: AutoExecutedToolResult[];
    }
  | {
      data: ApiResponse | null;
      error: string;
      /** HTTP status code from the SSE connection, if available */
      statusCode?: number;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
    };

/** Options passed to a streaming transport function. */
export type StreamingTransportOptions = {
  baseUrl: string;
  endpoint: string;
  body: Record<string, unknown>;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onSseError?: (error: unknown) => void;
};

/** Result returned by a streaming transport function. */
export type StreamingTransportResult = {
  stream: AsyncIterable<unknown>;
};

/**
 * A pluggable transport function for streaming SSE requests.
 * The default uses `fetch` + `ReadableStream`. React Native environments
 * can supply an XHR-based transport instead.
 */
export type StreamingTransport = (options: StreamingTransportOptions) => StreamingTransportResult;

/**
 * Default fetch-based streaming transport for the Portal API.
 */
const defaultTransport: StreamingTransport = (options) => {
  const url = `${options.baseUrl}${options.endpoint}`;
  return createSseClient({
    method: "POST",
    url,
    serializedBody: JSON.stringify(options.body),
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : undefined),
      ...options.headers,
    },
    signal: options.signal,
    sseMaxRetryAttempts: 1,
    onSseError: options.onSseError,
  });
};

/**
 * Framework-agnostic tool execution loop.
 *
 * Sends a streaming completion request, auto-executes tools that have executors,
 * feeds results back to the model, and repeats until the model stops emitting
 * tool calls or hits the iteration limit.
 *
 * This is the same loop that powers `useChat` in the React SDK, extracted so
 * it can be used from Node.js servers, CLI tools, and background workers.
 *
 * @example
 * ```ts
 * import { runToolLoop } from "@anuma/sdk/server";
 *
 * const result = await runToolLoop({
 *   messages: [{ role: "user", content: [{ type: "text", text: "What's the weather?" }] }],
 *   model: "gpt-4o",
 *   token: "my-api-token",
 *   tools: [{
 *     type: "function",
 *     function: { name: "get_weather", parameters: { type: "object", properties: { city: { type: "string" } } } },
 *     executor: async ({ city }) => fetchWeather(city),
 *   }],
 *   onData: (chunk) => process.stdout.write(chunk),
 * });
 * ```
 */
export async function runToolLoop(options: RunToolLoopOptions): Promise<RunToolLoopResult> {
  const {
    messages,
    model,
    token,
    baseUrl = BASE_URL,
    headers,
    apiType = "auto",
    temperature,
    maxOutputTokens,
    tools,
    toolChoice: toolChoiceArg,
    maxToolRounds,
    reasoning,
    thinking,
    imageModel,
    conversationId,
    smoothing,
    signal,
    onData,
    onThinking,
    onFinish,
    onError,
    onToolCall,
    onServerToolCall,
    onToolCallArgumentsDelta,
    onStepFinish,
    transport: makeStreamingRequest = defaultTransport,
    maxConnectorCalls = 2,
  } = options;

  const resolved = resolveApiType(apiType, model);
  const strategy = getStrategy(resolved);

  // Validate inputs
  const messagesValidation = validateMessages(messages);
  if (!messagesValidation.valid) {
    if (onError) onError(new Error(messagesValidation.message));
    return { data: null, error: messagesValidation.message };
  }

  const modelValidation = validateModel(model);
  if (!modelValidation.valid) {
    if (onError) onError(new Error(modelValidation.message));
    return { data: null, error: modelValidation.message };
  }

  if (!token && !headers) {
    const msg = "No access token available. Provide `token` or auth via `headers`.";
    if (onError) onError(new Error(msg));
    return { data: null, error: msg };
  }

  if (signal?.aborted) {
    return { data: null, error: "Request aborted" };
  }

  try {
    let sseError: Error | null = null;

    let apiTools = toolsToApiFormat(tools, resolved);
    let toolChoice = toolChoiceArg;

    const requestBody = strategy.buildRequestBody({
      messages,
      model,
      stream: true,
      temperature,
      maxOutputTokens,
      tools: apiTools,
      toolChoice,
      reasoning,
      thinking,
      imageModel,
      conversationId,
    });

    const sseResult = makeStreamingRequest({
      baseUrl,
      endpoint: strategy.endpoint,
      body: requestBody,
      token,
      headers,
      signal,
      onSseError: (error) => {
        sseError = wrapSseError(error);
      },
    });

    const accumulator = createStreamAccumulator(model || undefined);

    const contentSmoother = new StreamSmoother((text) => {
      if (onData) onData(text);
    }, smoothing);
    const thinkingSmoother = new StreamSmoother((text) => {
      if (onThinking) onThinking(text);
    }, smoothing);

    try {
      for await (const chunk of sseResult.stream) {
        if (isDoneMarker(chunk)) continue;

        if (chunk && typeof chunk === "object") {
          const {
            content: contentDelta,
            thinking: thinkingDelta,
            serverToolCall,
            toolCallArgumentsDelta,
          } = strategy.processStreamChunk(chunk, accumulator);
          if (contentDelta) contentSmoother.push(contentDelta);
          if (thinkingDelta) thinkingSmoother.push(thinkingDelta);
          if (serverToolCall && onServerToolCall) onServerToolCall(serverToolCall);
          if (toolCallArgumentsDelta && onToolCallArgumentsDelta)
            onToolCallArgumentsDelta(toolCallArgumentsDelta);
        }
      }
    } catch (streamErr) {
      if (isAbortError(streamErr) || signal?.aborted) {
        contentSmoother.destroy();
        thinkingSmoother.destroy();
        return {
          data: strategy.buildFinalResponse(accumulator),
          error: "Request aborted",
          toolsChecksum: accumulator.toolsChecksum,
        };
      }
      contentSmoother.destroy();
      thinkingSmoother.destroy();
      throw streamErr;
    }

    if (signal?.aborted) {
      contentSmoother.destroy();
      thinkingSmoother.destroy();
      return {
        data: strategy.buildFinalResponse(accumulator),
        error: "Request aborted",
        toolsChecksum: accumulator.toolsChecksum,
      };
    }

    if (sseError !== null) {
      contentSmoother.destroy();
      thinkingSmoother.destroy();
      throw sseError as Error;
    }

    await Promise.all([contentSmoother.drain(), thinkingSmoother.drain()]);

    const response = strategy.buildFinalResponse(accumulator);

    // ── Multi-turn tool calling loop ──
    const executorMap = createToolExecutorMap(tools);
    let currentAccumulator = accumulator;
    let currentMessages = messages;
    let toolIteration = 0;
    const effectiveMaxToolRounds = maxToolRounds ?? 3;
    const isConnectorTool = (name: string) => CONNECTOR_PREFIXES.some((p) => name.startsWith(p));
    const connectorCallCount = { total: 0 };
    let connectorLimitHit = false;

    while (currentAccumulator.toolCalls.size > 0 && toolIteration < MAX_TOOL_ITERATIONS) {
      toolIteration++;
      sseError = null;

      const toolCallsToExecute: AccumulatedToolCall[] = [];

      // Execute tools that have an executor; emit onToolCall for the rest
      for (const toolCall of currentAccumulator.toolCalls.values()) {
        const executorConfig = executorMap.get(toolCall.name);

        if (executorConfig) {
          toolCallsToExecute.push(toolCall);
        } else {
          if (onToolCall) {
            onToolCall({
              id: toolCall.id,
              type: toolCall.type,
              function: {
                name: toolCall.name,
                arguments: toolCall.arguments,
              },
            });
          }
        }
      }

      if (toolCallsToExecute.length === 0) {
        break;
      }

      // Output tool execution info to thinking stream
      if (onThinking) {
        const toolInfo = toolCallsToExecute
          .map((tc) => {
            try {
              const args = JSON.parse(tc.arguments) as Record<string, unknown>;
              const argsStr = Object.entries(args)
                .map(([k, v]) => `${k}=${String(v)}`)
                .join(", ");
              return `${tc.name}(${argsStr})`;
            } catch {
              return `${tc.name}(${tc.arguments})`;
            }
          })
          .join(", ");
        thinkingSmoother.push(`\nExecuting tool: ${toolInfo}\n`);
      }

      // Split tools into phases based on dependsOn. Tools whose dependsOn
      // includes a tool in the current batch must wait for that tool to finish.
      const batchToolNames = new Set(toolCallsToExecute.map((tc) => tc.name));
      const deferred: AccumulatedToolCall[] = [];
      const immediate: AccumulatedToolCall[] = [];
      for (const toolCall of toolCallsToExecute) {
        const config = executorMap.get(toolCall.name);
        const deps = config?.dependsOn;
        if (deps?.some((dep) => batchToolNames.has(dep))) {
          deferred.push(toolCall);
        } else {
          immediate.push(toolCall);
        }
      }

      const executeOne = async (toolCall: AccumulatedToolCall) => {
        const executorConfig = executorMap.get(toolCall.name);
        if (!executorConfig) {
          return {
            id: toolCall.id,
            error: `No executor found for tool: ${toolCall.name}`,
          };
        }

        const { result, error, errorType } = await executeToolCall(
          toolCall,
          executorConfig.executor,
          executorConfig.executorTimeout
        );

        return {
          id: toolCall.id,
          name: toolCall.name,
          result,
          error,
          errorType,
        };
      };

      // Phase 1: execute independent tools in parallel
      const immediateResults = await Promise.all(immediate.map(executeOne));
      // Phase 2: execute dependent tools in parallel (their dependencies are done)
      const deferredResults = await Promise.all(deferred.map(executeOne));
      const executionResults = [...immediateResults, ...deferredResults];

      // Remove connector tools after maxConnectorCalls (fast models only)
      const isFastModel = model?.startsWith("cerebras/");
      if (isFastModel && apiTools && isFinite(maxConnectorCalls)) {
        for (const tc of toolCallsToExecute) {
          if (isConnectorTool(tc.name)) {
            connectorCallCount.total++;
          }
        }

        if (connectorCallCount.total >= maxConnectorCalls) {
          apiTools = apiTools.filter((t) => {
            const name = getToolName(t);
            return !name || !isConnectorTool(name);
          });
          if (apiTools.length === 0) {
            apiTools = undefined;
            toolChoice = undefined;
          } else if (typeof toolChoice === "string" && isConnectorTool(toolChoice)) {
            toolChoice = "auto";
          }
          for (const [name] of executorMap) {
            if (isConnectorTool(name)) executorMap.delete(name);
          }
          connectorLimitHit = true;
        }
      }

      // Remove tools with removeAfterExecution: true that succeeded
      if (tools && apiTools) {
        const successfullyExecutedNames = new Set<string>();
        for (const r of executionResults) {
          if (!r.error && "name" in r && r.name) {
            successfullyExecutedNames.add(r.name);
          }
        }

        if (successfullyExecutedNames.size > 0) {
          const toolsToRemove = new Set<string>();
          for (const t of tools) {
            const tc = t as ToolConfig & Record<string, unknown>;
            const func = tc.function as Record<string, unknown> | undefined;
            const toolName: string | undefined =
              typeof func?.name === "string"
                ? func.name
                : typeof tc.name === "string"
                  ? tc.name
                  : undefined;
            if (
              tc.removeAfterExecution === true &&
              toolName &&
              successfullyExecutedNames.has(toolName)
            ) {
              toolsToRemove.add(toolName);
            }
          }

          if (toolsToRemove.size > 0) {
            apiTools = apiTools.filter((t) => {
              const name = getToolName(t);
              return !name || !toolsToRemove.has(name);
            });
            if (apiTools.length === 0) {
              apiTools = undefined;
              toolChoice = undefined;
            } else if (typeof toolChoice === "string" && toolsToRemove.has(toolChoice)) {
              toolChoice = "auto";
            }
            for (const name of toolsToRemove) {
              executorMap.delete(name);
            }
          }
        }
      }

      // Output tool results to thinking stream (skip tools that won't continue
      // to the LLM, as they can return very large results like 35K+ HTML that
      // would block drain() for minutes at the smoother's character rate)
      if (onThinking) {
        const thinkingResults = executionResults.filter(
          (r) => !r.name || executorMap.get(r.name)?.skipContinuation !== true
        );
        if (thinkingResults.length > 0) {
          const resultsText = thinkingResults
            .map((r) => {
              if (r.error) {
                return `${r.name}: Error - ${r.error}`;
              }
              const resultStr =
                typeof r.result === "string" ? r.result : safeJsonStringify(r.result);
              return `${r.name}: ${resultStr}`;
            })
            .join("\n");
          thinkingSmoother.push(`${resultsText}\n`);
        }
      }

      // Fire onStepFinish callback
      if (onStepFinish) {
        onStepFinish({
          stepIndex: toolIteration,
          content: currentAccumulator.content,
          toolCalls: toolCallsToExecute.map((tc) => ({
            name: tc.name,
            arguments: tc.arguments,
          })),
          toolResults: executionResults.map((r) => ({
            name: r.name ?? "",
            result: r.result,
            ...(r.error ? { error: r.error } : undefined),
            ...(r.errorType ? { errorType: r.errorType } : undefined),
          })),
          usage: {
            inputTokens: currentAccumulator.usage.prompt_tokens,
            outputTokens: currentAccumulator.usage.completion_tokens,
          },
        });
      }

      // Drain thinking smoother before continuation to avoid interleaved output
      await thinkingSmoother.drain();

      // Build tool result messages — exclude tools with skipContinuation
      const continueResults = executionResults.filter((r) => {
        if (!r.name) return false;
        return executorMap.get(r.name)?.skipContinuation !== true;
      });

      // If ALL tools have skipContinuation, return early
      if (continueResults.length === 0) {
        const skipResponse = strategy.buildFinalResponse(currentAccumulator);
        if (onFinish) onFinish(skipResponse);
        return {
          data: skipResponse,
          error: null,
          toolsChecksum: currentAccumulator.toolsChecksum,
          autoExecutedToolResults: executionResults
            .filter((r) => !r.error && r.name)
            .map((r) => ({ name: r.name!, result: r.result })),
        };
      }

      const continueToolCallIds = new Set(continueResults.map((r) => r.id));
      const assistantMessage: LlmapiMessage = {
        role: "assistant",
        content: [{ type: "text", text: currentAccumulator.content }],
        tool_calls: toolCallsToExecute
          .filter((tc) => continueToolCallIds.has(tc.id))
          .map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: tc.arguments || "{}",
            },
          })),
      };

      const toolResultMessages: LlmapiMessage[] = [assistantMessage];
      for (const execResult of continueResults) {
        const resultContent = execResult.error
          ? `Error: ${execResult.error}`
          : safeJsonStringify(execResult.result);

        toolResultMessages.push({
          role: "tool",
          content: [{ type: "text", text: resultContent }],
          tool_call_id: execResult.id,
        } as LlmapiMessage);
      }

      // Continue the conversation with tool results
      currentMessages = [...currentMessages, ...toolResultMessages];

      const continuationToolChoice = toolIteration >= effectiveMaxToolRounds ? "none" : toolChoice;

      const continuationRequestBody = strategy.buildRequestBody({
        messages: currentMessages,
        model,
        stream: true,
        temperature,
        maxOutputTokens,
        tools: apiTools,
        toolChoice: continuationToolChoice,
        reasoning,
        thinking,
        imageModel,
        conversationId,
      });

      const continuationResult = makeStreamingRequest({
        baseUrl,
        endpoint: strategy.endpoint,
        body: continuationRequestBody,
        token,
        headers,
        signal,
        onSseError: (error) => {
          sseError = wrapSseError(error);
        },
      });

      currentAccumulator = createStreamAccumulator(model || undefined);

      const contContentSmoother = new StreamSmoother((text) => {
        if (onData) onData(text);
      }, smoothing);
      const contThinkingSmoother = new StreamSmoother((text) => {
        if (onThinking) onThinking(text);
      }, smoothing);

      try {
        for await (const chunk of continuationResult.stream) {
          if (isDoneMarker(chunk)) continue;

          if (chunk && typeof chunk === "object") {
            const {
              content: contentDelta,
              thinking: thinkingDelta,
              serverToolCall,
              toolCallArgumentsDelta: contToolCallArgsDelta,
            } = strategy.processStreamChunk(chunk, currentAccumulator);
            if (contentDelta) contContentSmoother.push(contentDelta);
            if (thinkingDelta) contThinkingSmoother.push(thinkingDelta);
            if (serverToolCall && onServerToolCall) onServerToolCall(serverToolCall);
            if (contToolCallArgsDelta && onToolCallArgumentsDelta)
              onToolCallArgumentsDelta(contToolCallArgsDelta);
          }
        }
      } catch (streamErr) {
        if (isAbortError(streamErr) || signal?.aborted) {
          contContentSmoother.destroy();
          contThinkingSmoother.destroy();
          return {
            data: strategy.buildFinalResponse(currentAccumulator),
            error: "Request aborted",
            toolsChecksum: currentAccumulator.toolsChecksum,
          };
        }
        contContentSmoother.destroy();
        contThinkingSmoother.destroy();
        throw streamErr;
      }

      if (signal?.aborted) {
        contContentSmoother.destroy();
        contThinkingSmoother.destroy();
        return {
          data: strategy.buildFinalResponse(currentAccumulator),
          error: "Request aborted",
          toolsChecksum: currentAccumulator.toolsChecksum,
        };
      }

      if (sseError !== null) {
        contContentSmoother.destroy();
        contThinkingSmoother.destroy();
        throw sseError as Error;
      }

      await Promise.all([contContentSmoother.drain(), contThinkingSmoother.drain()]);
    }

    // Append connector limit tip after all content has streamed
    if (connectorLimitHit) {
      const tip =
        "\n\n> **Tip:** Switch to a **Thinking model** for more detailed results with connectors like Notion, Google Calendar, and Drive.\n";
      if (onData) onData(tip);
      currentAccumulator.content += tip;
    }

    // Build final response from the last accumulator
    if (toolIteration > 0) {
      const finalResponse = strategy.buildFinalResponse(currentAccumulator);
      if (onFinish) onFinish(finalResponse);
      return {
        data: finalResponse,
        error: null,
        toolsChecksum: currentAccumulator.toolsChecksum,
      };
    }

    if (onFinish) onFinish(response);
    return {
      data: response,
      error: null,
      toolsChecksum: accumulator.toolsChecksum,
    };
  } catch (err) {
    if (isAbortError(err)) {
      return { data: null, error: "Request aborted" };
    }

    const errorMsg = err instanceof Error ? err.message : "Failed to send message.";
    const errorObj = err instanceof Error ? err : new Error(errorMsg);
    if (onError) onError(errorObj);
    const statusCode =
      err instanceof Error && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
    return { data: null, error: errorMsg, statusCode };
  }
}
