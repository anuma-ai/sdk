"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../clientConfig";
import type { LlmapiMessage } from "../client";
import {
  type BaseSendMessageArgs,
  type BaseSendMessageResult,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  type StreamAccumulator,
  type StreamingChunk,
  type AccumulatedToolCall,
  createStreamAccumulator,
  validateMessages,
  validateModel,
  validateTokenGetter,
  validateToken,
  buildResponseResponse,
  createErrorResult,
  handleError,
  parseSSEDataLine,
  processStreamingChunk,
  toolsToApiFormat,
  createToolExecutorMap,
  executeToolCall,
} from "../lib/chat/useChat";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Per-request callback for thinking/reasoning chunks.
   */
  onThinking?: (chunk: string) => void;
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
};

type SendMessageResult = BaseSendMessageResult;

/**
 * @inline
 */
type UseChatOptions = BaseUseChatOptions;

type UseChatResult = BaseUseChatResult & {
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
};

/**
 * Processes SSE lines and updates the accumulator
 * Calls appropriate callbacks for content and thinking deltas
 */
function processSSELines(
  lines: string[],
  accumulator: StreamAccumulator,
  onData?: (chunk: string) => void,
  globalOnData?: (chunk: string) => void,
  onThinking?: (chunk: string) => void,
  globalOnThinking?: (chunk: string) => void
): void {
  for (const line of lines) {
    const chunk = parseSSEDataLine(line);
    if (!chunk) continue;

    // Use shared processing logic
    const { content: contentDelta, thinking: thinkingDelta } =
      processStreamingChunk(chunk, accumulator);

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

/**
 * A React hook for managing chat completions with authentication.
 *
 * **React Native version** - This is a lightweight version that only supports
 * API-based chat completions. Local chat and client-side tools are not available
 * in React Native.
 *
 * @param options - Optional configuration object
 * @param options.getToken - An async function that returns an authentication token.
 * @param options.baseUrl - Optional base URL for the API requests.
 * @param options.onData - Callback function to be called when a new data chunk is received.
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an unexpected error is encountered.
 *
 * @returns An object containing:
 *   - `isLoading`: A boolean indicating whether a request is currently in progress
 *   - `sendMessage`: An async function to send chat messages
 *   - `stop`: A function to abort the current request
 *
 * @category Hooks
 *
 * @example
 * ```tsx
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
  } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
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
    }: SendMessageArgs): Promise<SendMessageResult> => {
      // Validate inputs
      const messagesValidation = validateMessages(messages);
      if (!messagesValidation.valid) {
        return createErrorResult(messagesValidation.message, onError);
      }

      const modelValidation = validateModel(model);
      if (!modelValidation.valid) {
        return createErrorResult(modelValidation.message, onError);
      }

      const tokenGetterValidation = validateTokenGetter(getToken);
      if (!tokenGetterValidation.valid) {
        return createErrorResult(tokenGetterValidation.message, onError);
      }

      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      try {
        const token = await getToken!();

        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          setIsLoading(false);
          return createErrorResult(tokenValidation.message, onError);
        }

        // Convert tools to API format (strip executors)
        const apiTools = toolsToApiFormat(tools);

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

        // Use XMLHttpRequest for streaming in React Native
        // (fetch doesn't support response.body streaming in RN)
        const result = await new Promise<SendMessageResult>((resolve) => {
          const xhr = new XMLHttpRequest();
          const url = `${baseUrl}/api/v1/responses`;

          // Initialize accumulator with model name from request for early Qwen detection
          const accumulator = createStreamAccumulator(model || undefined);
          let lastProcessedIndex = 0;
          // Buffer for incomplete lines that span across XHR progress events
          let incompleteLineBuffer = "";

          // Handle abort
          const abortHandler = () => {
            xhr.abort();
          };
          abortController.signal.addEventListener("abort", abortHandler);

          xhr.open("POST", url, true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("Accept", "text/event-stream");

          xhr.onprogress = () => {
            // Process new data since last check
            const newData = xhr.responseText.substring(lastProcessedIndex);
            lastProcessedIndex = xhr.responseText.length;

            // Prepend any incomplete line from previous chunk
            const dataToProcess = incompleteLineBuffer + newData;
            incompleteLineBuffer = "";

            // Parse SSE events
            const lines = dataToProcess.split("\n");

            // Check if the last line is incomplete (doesn't end with newline)
            // If newData doesn't end with \n, the last line might be incomplete
            if (!newData.endsWith("\n") && lines.length > 0) {
              incompleteLineBuffer = lines.pop() || "";
            }

            processSSELines(
              lines,
              accumulator,
              onData,
              globalOnData,
              onThinking,
              globalOnThinking
            );
          };

          xhr.onload = async () => {
            abortController.signal.removeEventListener("abort", abortHandler);

            // Process any remaining data in the buffer
            if (incompleteLineBuffer) {
              processSSELines(
                [incompleteLineBuffer.trim()],
                accumulator,
                onData,
                globalOnData,
                onThinking,
                globalOnThinking
              );
              incompleteLineBuffer = "";
            }

            if (xhr.status >= 200 && xhr.status < 300) {
              const response = buildResponseResponse(accumulator);

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
                  console.log(
                    "[Tool Debug] Processing tool call:",
                    toolCall.name
                  );
                  const executorConfig = executorMap.get(toolCall.name);

                  if (executorConfig && executorConfig.autoExecute) {
                    // Will execute automatically
                    console.log(
                      "[Tool Debug] Will auto-execute:",
                      toolCall.name
                    );
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
                  try {
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

                    // Build tool result messages
                    const toolResultMessages: LlmapiMessage[] = [];

                    // Add the assistant's message with tool calls
                    toolResultMessages.push({
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
                    });

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

                    // Continue with tool results - make recursive call
                    const continuationMessages = [
                      ...messagesWithContext,
                      ...toolResultMessages,
                    ];

                    // Make continuation request
                    const continuationResult =
                      await new Promise<SendMessageResult>(
                        (continueResolve) => {
                          const continuationXhr = new XMLHttpRequest();
                          const continuationAccumulator =
                            createStreamAccumulator(model || undefined);
                          let contLastProcessedIndex = 0;
                          let contIncompleteLineBuffer = "";

                          const contAbortHandler = () => {
                            continuationXhr.abort();
                          };
                          abortController.signal.addEventListener(
                            "abort",
                            contAbortHandler
                          );

                          continuationXhr.open("POST", url, true);
                          continuationXhr.setRequestHeader(
                            "Content-Type",
                            "application/json"
                          );
                          continuationXhr.setRequestHeader(
                            "Authorization",
                            `Bearer ${token}`
                          );
                          continuationXhr.setRequestHeader(
                            "Accept",
                            "text/event-stream"
                          );

                          continuationXhr.onprogress = () => {
                            const newData =
                              continuationXhr.responseText.substring(
                                contLastProcessedIndex
                              );
                            contLastProcessedIndex =
                              continuationXhr.responseText.length;

                            const dataToProcess =
                              contIncompleteLineBuffer + newData;
                            contIncompleteLineBuffer = "";

                            const lines = dataToProcess.split("\n");
                            if (!newData.endsWith("\n") && lines.length > 0) {
                              contIncompleteLineBuffer = lines.pop() || "";
                            }

                            processSSELines(
                              lines,
                              continuationAccumulator,
                              onData,
                              globalOnData,
                              onThinking,
                              globalOnThinking
                            );
                          };

                          continuationXhr.onload = () => {
                            abortController.signal.removeEventListener(
                              "abort",
                              contAbortHandler
                            );

                            if (contIncompleteLineBuffer) {
                              processSSELines(
                                [contIncompleteLineBuffer.trim()],
                                continuationAccumulator,
                                onData,
                                globalOnData,
                                onThinking,
                                globalOnThinking
                              );
                            }

                            if (
                              continuationXhr.status >= 200 &&
                              continuationXhr.status < 300
                            ) {
                              const finalResponse = buildResponseResponse(
                                continuationAccumulator
                              );
                              continueResolve({
                                data: finalResponse,
                                error: null,
                              });
                            } else {
                              const errorMsg = `Continuation request failed with status ${continuationXhr.status}`;
                              continueResolve({ data: null, error: errorMsg });
                            }
                          };

                          continuationXhr.onerror = () => {
                            abortController.signal.removeEventListener(
                              "abort",
                              contAbortHandler
                            );
                            continueResolve({
                              data: null,
                              error: "Network error in continuation",
                            });
                          };

                          continuationXhr.onabort = () => {
                            abortController.signal.removeEventListener(
                              "abort",
                              contAbortHandler
                            );
                            continueResolve({
                              data: null,
                              error: "Request aborted",
                            });
                          };

                          continuationXhr.send(
                            JSON.stringify({
                              input: continuationMessages,
                              model,
                              stream: true,
                              ...(store !== undefined && { store }),
                              ...(previousResponseId && {
                                previous_response_id: previousResponseId,
                              }),
                              ...(conversation && { conversation }),
                              ...(temperature !== undefined && { temperature }),
                              ...(maxOutputTokens !== undefined && {
                                max_output_tokens: maxOutputTokens,
                              }),
                              ...(apiTools && { tools: apiTools }),
                              ...(toolChoice && { tool_choice: toolChoice }),
                              ...(reasoning && { reasoning }),
                              ...(thinking && { thinking }),
                            })
                          );
                        }
                      );

                    setIsLoading(false);
                    if (continuationResult.data && onFinish) {
                      onFinish(continuationResult.data);
                    }
                    resolve(continuationResult);
                    return;
                  } catch (toolError) {
                    const errorMsg = `Tool execution error: ${
                      toolError instanceof Error
                        ? toolError.message
                        : String(toolError)
                    }`;
                    setIsLoading(false);
                    if (onError) onError(new Error(errorMsg));
                    resolve({ data: null, error: errorMsg });
                    return;
                  }
                }
              }

              setIsLoading(false);
              if (onFinish) onFinish(response);
              resolve({ data: response, error: null });
            } else {
              const errorMsg = `Request failed with status ${xhr.status}`;
              setIsLoading(false);
              if (onError) onError(new Error(errorMsg));
              resolve({ data: null, error: errorMsg });
            }
          };

          xhr.onerror = () => {
            abortController.signal.removeEventListener("abort", abortHandler);
            const errorMsg = "Network error";
            setIsLoading(false);
            if (onError) onError(new Error(errorMsg));
            resolve({ data: null, error: errorMsg });
          };

          xhr.onabort = () => {
            abortController.signal.removeEventListener("abort", abortHandler);
            setIsLoading(false);
            resolve({ data: null, error: "Request aborted" });
          };

          const requestBody = {
            input: messagesWithContext,
            model,
            stream: true,
            // Responses API options (only include if defined)
            ...(store !== undefined && { store }),
            ...(previousResponseId && {
              previous_response_id: previousResponseId,
            }),
            ...(conversation && { conversation }),
            ...(temperature !== undefined && { temperature }),
            ...(maxOutputTokens !== undefined && {
              max_output_tokens: maxOutputTokens,
            }),
            ...(apiTools && { tools: apiTools }),
            ...(toolChoice && { tool_choice: toolChoice }),
            ...(reasoning && { reasoning }),
            ...(thinking && { thinking }),
          };

          // Debug: Log the full request body to see image format
          console.log(
            "[useChat] Request body:",
            JSON.stringify(requestBody, null, 2)
          );

          xhr.send(JSON.stringify(requestBody));
        });

        return result;
      } catch (err) {
        setIsLoading(false);
        return handleError(err, onError);
      } finally {
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
    ]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
