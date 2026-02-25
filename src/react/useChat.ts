"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiMessage } from "../client";
import { client } from "../client/client.gen";
import { BASE_URL } from "../clientConfig";
import {
  type AccumulatedToolCall,
  type ApiResponse,
  type ApiType,
  type BaseSendMessageArgs,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  createErrorResult,
  createStreamAccumulator,
  createToolExecutorMap,
  executeToolCall,
  getStrategy,
  handleError,
  isAbortError,
  isDoneMarker,
  StreamSmoother,
  toolsToApiFormat,
  validateMessages,
  validateModel,
  validateToken,
  validateTokenGetter,
} from "../lib/chat/useChat";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Optional custom headers to include with the request.
   */
  headers?: Record<string, string>;
  /**
   * Memory context to inject as a system message.
   * This is typically context from memory retrieval or other sources.
   */
  memoryContext?: string;
  /**
   * Search context to inject as a system message.
   * This is typically formatted search results from useSearch.
   */
  searchContext?: string;
  /**
   * File context to inject as a system message.
   * This is typically extracted text from preprocessed file attachments.
   */
  fileContext?: string;
  /**
   * Per-request callback for thinking/reasoning chunks. Called in addition to the global
   * `onThinking` callback if provided in `useChat` options.
   *
   * @param chunk - The thinking delta from the current chunk
   */
  onThinking?: (chunk: string) => void;
  /**
   * Override the API type for this request only.
   * Useful when different models need different APIs.
   * @default Uses the hook-level apiType or "responses"
   */
  apiType?: ApiType;
};

/** A tool result from an auto-executed tool (e.g. display tools). */
type AutoExecutedToolResult = {
  name: string;
  result: any;
};

type SendMessageResult =
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
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
    };

/**
 * @inline
 */
interface UseChatOptions extends BaseUseChatOptions {
  /**
   * Which API endpoint to use. Default: "responses"
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   */
  apiType?: ApiType;
}

type UseChatResult = BaseUseChatResult & {
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
};

/**
 * A React hook for managing chat completions with authentication.
 *
 * This hook provides a convenient way to send chat messages to the LLM API
 * with automatic token management and loading state handling.
 * Streaming is enabled by default for better user experience.
 *
 * @param options - Optional configuration object
 * @param options.getToken - An async function that returns an authentication token.
 *   This token will be used as a Bearer token in the Authorization header.
 *   If not provided, `sendMessage` will return an error.
 * @param options.baseUrl - Optional base URL for the API requests.
 * @param options.onData - Callback function to be called when a new data chunk is received.
 * @param options.onThinking - Callback function to be called when thinking/reasoning content is received.
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an unexpected error
 *   is encountered. Note: This is NOT called for aborted requests (see `stop()`).
 *
 * @category Hooks
 *
 * @example
 * ```tsx
 * // Basic usage with API
 * const { isLoading, sendMessage, stop } = useChat({
 *   getToken: async () => await getAuthToken(),
 *   onFinish: (response) => console.log("Chat finished:", response),
 *   onError: (error) => console.error("Chat error:", error)
 * });
 *
 * const handleSend = async () => {
 *   const result = await sendMessage({
 *     messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }],
 *     model: 'gpt-4o-mini'
 *   });
 * };
 *
 * // Using extended thinking (Anthropic Claude)
 * const result = await sendMessage({
 *   messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve this complex problem...' }] }],
 *   model: 'anthropic/claude-3-7-sonnet-20250219',
 *   thinking: { type: 'enabled', budget_tokens: 10000 },
 *   onThinking: (chunk) => console.log('Thinking:', chunk)
 * });
 *
 * // Using reasoning (OpenAI o-series)
 * const result = await sendMessage({
 *   messages: [{ role: 'user', content: [{ type: 'text', text: 'Reason through this...' }] }],
 *   model: 'openai/o1',
 *   reasoning: { effort: 'high', summary: 'detailed' }
 * });
 * ```
 */
export function useChat(options?: UseChatOptions): UseChatResult {
  const {
    getToken,
    baseUrl = BASE_URL,
    onData: globalOnData,
    onThinking: globalOnThinking,
    onFinish,
    onError,
    onToolCall,
    onServerToolCall,
    apiType: defaultApiType = "responses",
    smoothing,
  } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount, aborting any active streaming request and clearing the abort controller reference
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onData,
      onThinking,
      headers,
      memoryContext,
      searchContext,
      fileContext,
      // Responses API options
      temperature,
      maxOutputTokens,
      tools,
      toolChoice: toolChoiceArg,
      maxToolRounds,
      reasoning,
      thinking,
      imageModel,
      apiType: requestApiType,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      // Get the effective API type and strategy
      const effectiveApiType = requestApiType ?? defaultApiType;
      const strategy = getStrategy(effectiveApiType);
      // Validate messages
      const messagesValidation = validateMessages(messages);
      if (!messagesValidation.valid) {
        return createErrorResult(messagesValidation.message, onError);
      }

      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      // Inject memory context as a system message at the beginning if provided
      let messagesWithContext = messages;
      if (memoryContext) {
        const memorySystemMessage: LlmapiMessage = {
          role: "system",
          content: [
            {
              type: "text",
              text: memoryContext,
            },
          ],
        };
        messagesWithContext = [memorySystemMessage, ...messages];
      }

      if (searchContext) {
        const searchSystemMessage: LlmapiMessage = {
          role: "system",
          content: [
            {
              type: "text",
              text: "Here are the search results for the user's query. Use this information to respond to the user's request:",
            },
            {
              type: "text",
              text: searchContext,
            },
          ],
        };
        messagesWithContext = [searchSystemMessage, ...messagesWithContext];
      }

      if (fileContext) {
        const fileSystemMessage: LlmapiMessage = {
          role: "system",
          content: [
            {
              type: "text",
              text:
                'IMPORTANT: The user has attached files to this conversation. The extracted file contents are shown below. When the user asks about "the file", "this file", or "what\'s in the file", refer to this content:\n\n' +
                fileContext,
            },
          ],
        };
        messagesWithContext = [fileSystemMessage, ...messagesWithContext];
      }

      // Check if aborted before proceeding to chat
      if (abortController.signal.aborted) {
        setIsLoading(false);
        return {
          data: null,
          error: "Request aborted",
        };
      }

      try {
        // Validate model and token
        const modelValidation = validateModel(model);
        if (!modelValidation.valid) {
          if (onError) onError(new Error(modelValidation.message));
          return {
            data: null,
            error: modelValidation.message,
          };
        }

        const tokenGetterValidation = validateTokenGetter(getToken);
        if (!tokenGetterValidation.valid) {
          if (onError) onError(new Error(tokenGetterValidation.message));
          return {
            data: null,
            error: tokenGetterValidation.message,
          };
        }

        const token = await getToken!();

        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          if (onError) onError(new Error(tokenValidation.message));
          return {
            data: null,
            error: tokenValidation.message,
          };
        }

        // Use SSE client for streaming
        // Track SSE errors to surface them after streaming completes
        let sseError: Error | null = null;

        // Convert tools to API format (strip executors)
        let apiTools = toolsToApiFormat(tools);
        let toolChoice = toolChoiceArg;
        // Build request body using the strategy
        const requestBody = strategy.buildRequestBody({
          messages: messagesWithContext,
          model: model!,
          stream: true,
          temperature,
          maxOutputTokens,
          tools: apiTools,
          toolChoice,
          reasoning,
          thinking,
          imageModel,
        });

        const sseResult = await client.sse.post({
          baseUrl,
          url: strategy.endpoint,
          body: requestBody,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...headers,
          },
          signal: abortController.signal,
          sseMaxRetryAttempts: 1,
          onSseError: (error) => {
            sseError = error instanceof Error ? error : new Error(String(error));
          },
        });

        // Initialize accumulator with model name from request for early Qwen detection
        const accumulator = createStreamAccumulator(model || undefined);

        // Create smoothers for adaptive output pacing
        const contentSmoother = new StreamSmoother((text) => {
          if (onData) onData(text);
          if (globalOnData) globalOnData(text);
        }, smoothing);
        const thinkingSmoother = new StreamSmoother((text) => {
          if (onThinking) onThinking(text);
          if (globalOnThinking) globalOnThinking(text);
        }, smoothing);

        try {
          for await (const chunk of sseResult.stream) {
            // Skip [DONE] marker
            if (isDoneMarker(chunk)) {
              continue;
            }

            // Handle chunk data
            if (chunk && typeof chunk === "object") {
              const {
                content: contentDelta,
                thinking: thinkingDelta,
                serverToolCall,
              } = strategy.processStreamChunk(chunk, accumulator);
              if (contentDelta) {
                contentSmoother.push(contentDelta);
              }
              if (thinkingDelta) {
                thinkingSmoother.push(thinkingDelta);
              }
              if (serverToolCall && onServerToolCall) {
                onServerToolCall(serverToolCall);
              }
            }
          }
        } catch (streamErr) {
          // Check if this was an abort during streaming
          if (isAbortError(streamErr) || abortController.signal.aborted) {
            contentSmoother.destroy();
            thinkingSmoother.destroy();
            // Return partial data so far
            const partialResponse = strategy.buildFinalResponse(accumulator);
            return {
              data: partialResponse,
              error: "Request aborted",
              toolsChecksum: accumulator.toolsChecksum,
            };
          }
          contentSmoother.destroy();
          thinkingSmoother.destroy();
          throw streamErr;
        }

        // Check if abort happened during streaming but loop completed before throw
        if (abortController.signal.aborted) {
          contentSmoother.destroy();
          thinkingSmoother.destroy();
          const partialResponse = strategy.buildFinalResponse(accumulator);
          return {
            data: partialResponse,
            error: "Request aborted",
            toolsChecksum: accumulator.toolsChecksum,
          };
        }

        // Check if SSE encountered an error
        if (sseError) {
          contentSmoother.destroy();
          thinkingSmoother.destroy();
          throw sseError;
        }

        // Drain remaining buffered content smoothly before building final response
        await Promise.all([contentSmoother.drain(), thinkingSmoother.drain()]);

        // Build the final response
        const response = strategy.buildFinalResponse(accumulator);

        // Multi-turn tool calling loop: handle chained tool calls (max 10 iterations)
        const executorMap = createToolExecutorMap(tools);
        let currentAccumulator = accumulator;
        let currentMessages = messagesWithContext;
        let toolIteration = 0;
        const MAX_TOOL_ITERATIONS = 10;
        const effectiveMaxToolRounds = maxToolRounds ?? 3;
        // Track connector tool call counts (Notion, Google Calendar, Google Drive)
        const CONNECTOR_PREFIXES = ["notion-", "google_calendar_", "google_drive_"];
        const isConnectorTool = (name: string) =>
          CONNECTOR_PREFIXES.some((p) => name.startsWith(p));
        const connectorCallCount = { total: 0 };
        let connectorLimitHit = false;
        while (currentAccumulator.toolCalls.size > 0 && toolIteration < MAX_TOOL_ITERATIONS) {
          toolIteration++;

          const toolCallsToExecute: AccumulatedToolCall[] = [];

          // Determine which tools to execute vs emit as events
          for (const toolCall of currentAccumulator.toolCalls.values()) {
            const executorConfig = executorMap.get(toolCall.name);

            if (executorConfig && executorConfig.autoExecute) {
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

          // If no tools to auto-execute, break out of the loop
          if (toolCallsToExecute.length === 0) {
            break;
          }

          // Output tool execution info to thinking section (via smoother)
          if (onThinking || globalOnThinking) {
            const toolInfo = toolCallsToExecute
              .map((tc) => {
                try {
                  const args = JSON.parse(tc.arguments);
                  const argsStr = Object.entries(args)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ");
                  return `${tc.name}(${argsStr})`;
                } catch {
                  return `${tc.name}(${tc.arguments})`;
                }
              })
              .join(", ");
            thinkingSmoother.push(`\nExecuting tool: ${toolInfo}\n`);
          }

          // Execute all tools in parallel
          const executionResults = await Promise.all(
            toolCallsToExecute.map(async (toolCall) => {
              const executorConfig = executorMap.get(toolCall.name);
              if (!executorConfig) {
                return {
                  id: toolCall.id,
                  error: `No executor found for tool: ${toolCall.name}`,
                };
              }

              const { result, error } = await executeToolCall(toolCall, executorConfig.executor);

              return {
                id: toolCall.id,
                name: toolCall.name,
                result,
                error,
              };
            })
          );

          // Remove all connector tools once total connector calls reach 2.
          // Only for fast models (cerebras) — smarter models handle tools well.
          const isFastModel = model?.startsWith("cerebras/");
          if (isFastModel && apiTools) {
            for (const tc of toolCallsToExecute) {
              if (isConnectorTool(tc.name)) {
                connectorCallCount.total++;
              }
            }

            if (connectorCallCount.total >= 2) {
              apiTools = apiTools.filter((t) => {
                const name = (t as any).function?.name || (t as any).name;
                return !name || !isConnectorTool(name);
              });
              if (apiTools.length === 0) {
                apiTools = undefined;
                toolChoice = undefined;
              } else if (typeof toolChoice === "string" && isConnectorTool(toolChoice)) {
                toolChoice = undefined;
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
                const tc = t as any;
                const toolName: string | undefined = tc.function?.name || tc.name;
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
                  const name = (t as any).function?.name || (t as any).name;
                  return !toolsToRemove.has(name);
                });
                if (apiTools.length === 0) {
                  apiTools = undefined;
                  toolChoice = undefined;
                } else if (typeof toolChoice === "string" && toolsToRemove.has(toolChoice)) {
                  // Clear toolChoice if it references a removed tool
                  toolChoice = undefined;
                }
                // Also remove from executorMap to prevent accidental re-execution
                for (const name of toolsToRemove) {
                  executorMap.delete(name);
                }
              }
            }
          }

          // Output tool execution results to thinking section (via smoother)
          if (onThinking || globalOnThinking) {
            const resultsText = executionResults
              .map((r) => {
                if (r.error) {
                  return `${r.name}: Error - ${r.error}`;
                }
                const resultStr =
                  typeof r.result === "object" ? JSON.stringify(r.result) : String(r.result);
                return `${r.name}: ${resultStr}`;
              })
              .join("\n");
            thinkingSmoother.push(`${resultsText}\n`);
          }

          // Drain the thinking smoother to ensure tool info is fully delivered
          // before creating continuation smoothers (prevents interleaved output)
          await thinkingSmoother.drain();

          // Build tool result messages to send back to the model.
          // Filter out results from tools with skipContinuation individually,
          // so display-only tools (charts, weather) don't get sent back while
          // regular tools (Drive, Calendar, Notion) still do.
          const toolResultMessages: LlmapiMessage[] = [];

          // Separate execution results into skip and continue groups
          const continueResults = executionResults.filter(
            (r) => !r.name || executorMap.get(r.name)?.skipContinuation !== true
          );

          // If ALL tools have skipContinuation, return early without continuation
          if (continueResults.length === 0) {
            const skipResponse = strategy.buildFinalResponse(currentAccumulator);
            if (onFinish) {
              onFinish(skipResponse);
            }
            return {
              data: skipResponse,
              error: null,
              toolsChecksum: currentAccumulator.toolsChecksum,
              autoExecutedToolResults: executionResults
                .filter((r) => !r.error && r.name)
                .map((r) => ({ name: r.name!, result: r.result })),
            };
          }

          // Build the assistant message with ONLY non-skip tool calls.
          // The model must not see tool_call IDs for which there are no
          // corresponding tool-role messages.
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
                  arguments: tc.arguments,
                },
              })),
          };
          toolResultMessages.push(assistantMessage);

          // Add tool result messages for non-skip tools only
          for (const execResult of continueResults) {
            const resultContent = execResult.error
              ? `Error: ${execResult.error}`
              : JSON.stringify(execResult.result);

            toolResultMessages.push({
              role: "tool",
              content: [{ type: "text", text: resultContent }],
              tool_call_id: execResult.id,
            } as LlmapiMessage);
          }

          // Continue the conversation with tool results
          currentMessages = [...currentMessages, ...toolResultMessages];

          // After maxToolRounds, force the model to produce a text response
          const continuationToolChoice =
            toolIteration >= effectiveMaxToolRounds ? "none" : toolChoice;

          const continuationRequestBody = strategy.buildRequestBody({
            messages: currentMessages,
            model: model!,
            stream: true,
            temperature,
            maxOutputTokens,
            tools: apiTools,
            toolChoice: continuationToolChoice,
            reasoning,
            thinking,
            imageModel,
          });

          const continuationResult = await client.sse.post({
            baseUrl,
            url: strategy.endpoint,
            body: continuationRequestBody,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...headers,
            },
            signal: abortController.signal,
            sseMaxRetryAttempts: 1,
            onSseError: (error) => {
              sseError = error instanceof Error ? error : new Error(String(error));
            },
          });

          // Create a new accumulator for the continuation
          currentAccumulator = createStreamAccumulator(model || undefined);

          // Create fresh smoothers for the continuation stream
          const contContentSmoother = new StreamSmoother((text) => {
            if (onData) onData(text);
            if (globalOnData) globalOnData(text);
          }, smoothing);
          const contThinkingSmoother = new StreamSmoother((text) => {
            if (onThinking) onThinking(text);
            if (globalOnThinking) globalOnThinking(text);
          }, smoothing);

          try {
            for await (const chunk of continuationResult.stream) {
              if (isDoneMarker(chunk)) {
                continue;
              }

              if (chunk && typeof chunk === "object") {
                const {
                  content: contentDelta,
                  thinking: thinkingDelta,
                  serverToolCall,
                } = strategy.processStreamChunk(chunk, currentAccumulator);
                if (contentDelta) {
                  contContentSmoother.push(contentDelta);
                }
                if (thinkingDelta) {
                  contThinkingSmoother.push(thinkingDelta);
                }
                if (serverToolCall && onServerToolCall) {
                  onServerToolCall(serverToolCall);
                }
              }
            }
          } catch (streamErr) {
            if (isAbortError(streamErr) || abortController.signal.aborted) {
              contContentSmoother.destroy();
              contThinkingSmoother.destroy();
              const partialResponse = strategy.buildFinalResponse(currentAccumulator);
              return {
                data: partialResponse,
                error: "Request aborted",
                toolsChecksum: currentAccumulator.toolsChecksum,
              };
            }
            contContentSmoother.destroy();
            contThinkingSmoother.destroy();
            throw streamErr;
          }

          if (abortController.signal.aborted) {
            contContentSmoother.destroy();
            contThinkingSmoother.destroy();
            const partialResponse = strategy.buildFinalResponse(currentAccumulator);
            return {
              data: partialResponse,
              error: "Request aborted",
              toolsChecksum: currentAccumulator.toolsChecksum,
            };
          }

          if (sseError) {
            contContentSmoother.destroy();
            contThinkingSmoother.destroy();
            throw sseError;
          }

          // Drain remaining buffered content smoothly
          await Promise.all([contContentSmoother.drain(), contThinkingSmoother.drain()]);

          // Loop continues: if currentAccumulator has more tool calls,
          // the while condition will trigger another iteration
        }

        // Append connector limit tip after all content has streamed
        if (connectorLimitHit) {
          const tip =
            "\n\n> **Tip:** Switch to a **Thinking model** for more detailed results with connectors like Notion, Google Calendar, and Drive.\n";
          if (onData) onData(tip);
          if (globalOnData) globalOnData(tip);
          currentAccumulator.content += tip;
        }

        // Build final response from the last accumulator (after all tool iterations)
        if (toolIteration > 0) {
          const finalResponse = strategy.buildFinalResponse(currentAccumulator);
          if (onFinish) {
            onFinish(finalResponse);
          }
          return {
            data: finalResponse,
            error: null,
            toolsChecksum: currentAccumulator.toolsChecksum,
          };
        }

        if (onFinish) {
          onFinish(response);
        }
        return {
          data: response,
          error: null,
          toolsChecksum: accumulator.toolsChecksum,
        };
      } catch (err) {
        // Handle AbortError specifically - aborts are intentional user actions,
        // not errors, so we don't trigger onError callback
        if (isAbortError(err)) {
          return {
            data: null,
            error: "Request aborted",
          };
        }

        const errorResult = handleError<{
          data: null;
          error: string;
        }>(err, onError);
        return errorResult;
      } finally {
        // Always reset loading state, regardless of success or failure
        // This prevents the UI from getting "stuck" in loading state on errors
        setIsLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      getToken,
      baseUrl,
      globalOnData,
      globalOnThinking,
      onFinish,
      onError,
      onToolCall,
      onServerToolCall,
      defaultApiType,
      smoothing,
    ]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
