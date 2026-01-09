"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { client } from "../client/client.gen";
import { BASE_URL } from "../clientConfig";
import type { LlmapiMessage, LlmapiResponseResponse } from "../client";
import {
  type BaseSendMessageArgs,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  type AccumulatedToolCall,
  type ApiType,
  createStreamAccumulator,
  validateMessages,
  validateModel,
  validateTokenGetter,
  validateToken,
  createErrorResult,
  handleError,
  isAbortError,
  isDoneMarker,
  toolsToApiFormat,
  createToolExecutorMap,
  executeToolCall,
  getStrategy,
} from "../lib/chat/useChat";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Optional custom headers to include with the request.
   */
  headers?: Record<string, string>;
  /**
   * Memory context to inject as a system message.
   * This is typically formatted memories from useMemoryStorage.
   */
  memoryContext?: string;
  /**
   * Search context to inject as a system message.
   * This is typically formatted search results from useSearch.
   */
  searchContext?: string;
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

type SendMessageResult =
  | {
      data: LlmapiResponseResponse;
      error: null;
    }
  | {
      data: LlmapiResponseResponse | null;
      error: string;
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
    apiType: defaultApiType = "responses",
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
      // Responses API options
      store,
      previousResponseId,
      conversation,
      temperature,
      maxOutputTokens,
      tools,
      toolChoice,
      reasoning,
      thinking,
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
        const apiTools = toolsToApiFormat(tools);

        // Build request body using the strategy
        const requestBody = strategy.buildRequestBody({
          messages: messagesWithContext,
          model: model!,
          stream: true,
          temperature,
          maxOutputTokens,
          tools: apiTools,
          toolChoice,
          store,
          previousResponseId,
          conversation,
          reasoning,
          thinking,
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
            sseError =
              error instanceof Error ? error : new Error(String(error));
          },
        });

        const accumulator = createStreamAccumulator();

        try {
          for await (const chunk of sseResult.stream) {
            // Skip [DONE] marker
            if (isDoneMarker(chunk)) {
              continue;
            }

            // Handle chunk data
            if (chunk && typeof chunk === "object") {
              const { content: contentDelta, thinking: thinkingDelta } =
                strategy.processStreamChunk(chunk, accumulator);
              if (contentDelta) {
                if (onData) onData(contentDelta);
                if (globalOnData) globalOnData(contentDelta);
              }
              if (thinkingDelta) {
                if (onThinking) onThinking(thinkingDelta);
                if (globalOnThinking) globalOnThinking(thinkingDelta);
              }
            }
          }
        } catch (streamErr) {
          // Check if this was an abort during streaming
          if (isAbortError(streamErr) || abortController.signal.aborted) {
            // Return partial data so far
            const partialResponse = strategy.buildFinalResponse(accumulator);
            return {
              data: partialResponse,
              error: "Request aborted",
            };
          }
          throw streamErr;
        }

        // Check if abort happened during streaming but loop completed before throw
        if (abortController.signal.aborted) {
          const partialResponse = strategy.buildFinalResponse(accumulator);
          return {
            data: partialResponse,
            error: "Request aborted",
          };
        }

        // Check if SSE encountered an error
        if (sseError) {
          throw sseError;
        }

        // Build the final response
        const response = strategy.buildFinalResponse(accumulator);

        // Check for tool calls and handle them
        if (accumulator.toolCalls.size > 0) {
          console.log(
            "[Tool Debug] Found",
            accumulator.toolCalls.size,
            "tool calls"
          );
          const executorMap = createToolExecutorMap(tools);
          const toolCallsToExecute: AccumulatedToolCall[] = [];

          // Determine which tools to execute vs emit as events
          for (const toolCall of accumulator.toolCalls.values()) {
            console.log("[Tool Debug] Processing tool call:", toolCall.name);
            const executorConfig = executorMap.get(toolCall.name);

            if (executorConfig && executorConfig.autoExecute) {
              // Will execute automatically
              console.log("[Tool Debug] Will auto-execute:", toolCall.name);
              toolCallsToExecute.push(toolCall);
            } else {
              // Emit event for manual handling
              console.log(
                "[Tool Debug] Emitting onToolCall event for:",
                toolCall.name
              );
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

          // If we have tools to auto-execute, execute them and continue
          if (toolCallsToExecute.length > 0) {
            console.log(
              "[Tool Debug] Executing",
              toolCallsToExecute.length,
              "tools"
            );

            // Output tool execution info to thinking section
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
              const thinkingText = `\nExecuting tool: ${toolInfo}\n`;
              if (onThinking) onThinking(thinkingText);
              if (globalOnThinking) globalOnThinking(thinkingText);
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

                // toolCall is already the AccumulatedToolCall from the map, use it directly
                const { result, error } = await executeToolCall(
                  toolCall,
                  executorConfig.executor
                );

                console.log(
                  "[Tool Debug] Tool execution result for",
                  toolCall.name,
                  ":",
                  { result, error }
                );

                return {
                  id: toolCall.id,
                  name: toolCall.name,
                  result,
                  error,
                };
              })
            );

            console.log(
              "[Tool Debug] All tools executed, results:",
              executionResults.length
            );

            // Output tool execution results to thinking section
            if (onThinking || globalOnThinking) {
              const resultsText = executionResults
                .map((r) => {
                  if (r.error) {
                    return `${r.name}: Error - ${r.error}`;
                  }
                  const resultStr =
                    typeof r.result === "object"
                      ? JSON.stringify(r.result)
                      : String(r.result);
                  return `${r.name}: ${resultStr}`;
                })
                .join("\n");
              const thinkingText = `${resultsText}\n`;
              if (onThinking) onThinking(thinkingText);
              if (globalOnThinking) globalOnThinking(thinkingText);
            }

            // Build tool result messages to send back to the model
            const toolResultMessages: LlmapiMessage[] = [];

            // Add the assistant's message with tool calls
            const assistantMessage: LlmapiMessage = {
              role: "assistant",
              content: [{ type: "text", text: accumulator.content }],
              tool_calls: toolCallsToExecute.map((tc) => ({
                id: tc.id,
                type: "function",
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              })),
            };
            toolResultMessages.push(assistantMessage);

            // Add tool result messages
            for (const execResult of executionResults) {
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
            const continuationMessages = [
              ...messagesWithContext,
              ...toolResultMessages,
            ];

            console.log(
              "[Tool Debug] Continuation messages:",
              JSON.stringify(continuationMessages, null, 2)
            );

            // Recursive call to continue with tool results
            // Use the same parameters but with updated messages
            const continuationRequestBody = strategy.buildRequestBody({
              messages: continuationMessages,
              model: model!,
              stream: true,
              temperature,
              maxOutputTokens,
              tools: apiTools,
              toolChoice,
              store,
              previousResponseId,
              conversation,
              reasoning,
              thinking,
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
                sseError =
                  error instanceof Error ? error : new Error(String(error));
              },
            });

            // Create a new accumulator for the continuation
            const continuationAccumulator = createStreamAccumulator();

            try {
              for await (const chunk of continuationResult.stream) {
                if (isDoneMarker(chunk)) {
                  continue;
                }

                if (chunk && typeof chunk === "object") {
                  const { content: contentDelta, thinking: thinkingDelta } =
                    strategy.processStreamChunk(chunk, continuationAccumulator);
                  if (contentDelta) {
                    if (onData) onData(contentDelta);
                    if (globalOnData) globalOnData(contentDelta);
                  }
                  if (thinkingDelta) {
                    if (onThinking) onThinking(thinkingDelta);
                    if (globalOnThinking) globalOnThinking(thinkingDelta);
                  }
                }
              }

              console.log(
                "[Tool Debug] Continuation stream complete - accumulated content:",
                continuationAccumulator.content
              );
              console.log(
                "[Tool Debug] Continuation stream complete - accumulated thinking:",
                continuationAccumulator.thinking
              );
            } catch (streamErr) {
              if (isAbortError(streamErr) || abortController.signal.aborted) {
                const partialResponse = strategy.buildFinalResponse(
                  continuationAccumulator
                );
                return {
                  data: partialResponse,
                  error: "Request aborted",
                };
              }
              throw streamErr;
            }

            if (abortController.signal.aborted) {
              const partialResponse = strategy.buildFinalResponse(
                continuationAccumulator
              );
              return {
                data: partialResponse,
                error: "Request aborted",
              };
            }

            if (sseError) {
              throw sseError;
            }

            // Build final response from continuation
            const finalResponse = strategy.buildFinalResponse(
              continuationAccumulator
            );

            if (onFinish) {
              onFinish(finalResponse);
            }
            return {
              data: finalResponse,
              error: null,
            };
          }
        }

        if (onFinish) {
          onFinish(response);
        }
        return {
          data: response,
          error: null,
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
      defaultApiType,
    ]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
