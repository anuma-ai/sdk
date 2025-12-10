"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { client } from "../client/client.gen";
import { BASE_URL } from "../clientConfig";
import type { LlmapiChatCompletionResponse, LlmapiMessage } from "../client";
import type { ClientTool, ToolExecutionResult } from "../lib/tools/types";
import {
  type BaseSendMessageArgs,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  type StreamingChunk,
  createStreamAccumulator,
  validateMessages,
  validateModel,
  validateTokenGetter,
  validateToken,
  buildCompletionResponse,
  processStreamingChunk,
  createErrorResult,
  handleError,
  isAbortError,
  isDoneMarker,
} from "../lib/chat/useChat";
import { generateLocalChatCompletion } from "../lib/chat/generation";
import { DEFAULT_LOCAL_CHAT_MODEL } from "../lib/chat/constants";
import {
  selectTool,
  executeTool,
  preloadToolSelectorModel,
  DEFAULT_TOOL_SELECTOR_MODEL,
} from "../lib/tools/selector";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Whether to run tool selection for this message.
   * Defaults to true if tools are configured.
   */
  runTools?: boolean;
  /**
   * Optional custom headers to include with the request.
   */
  headers?: Record<string, string>;
};

type SendMessageResult =
  | {
      data: LlmapiChatCompletionResponse;
      error: null;
      toolExecution?: ToolExecutionResult;
    }
  | { data: null; error: string; toolExecution?: ToolExecutionResult };

type UseChatOptions = BaseUseChatOptions & {
  /**
   * The provider to use for chat completions (default: "api")
   * "local": Uses a local HuggingFace model (in-browser)
   * "api": Uses the backend API
   */
  chatProvider?: "api" | "local";
  /**
   * The model to use for local chat completions
   * Default is "ibm-granite/Granite-4.0-Nano-WebGPU"
   */
  localModel?: string;
  /**
   * Client-side tools that can be executed in the browser.
   * When provided, the hook will use a local model to determine
   * if any tool should be called based on the user's message.
   */
  tools?: ClientTool[];
  /**
   * The model to use for tool selection.
   * Default is "onnx-community/granite-4.0-350m-ONNX-web"
   */
  toolSelectorModel?: string;
  /**
   * Callback function to be called when a tool is executed.
   */
  onToolExecution?: (result: ToolExecutionResult) => void;
};

type UseChatResult = BaseUseChatResult & {
  isSelectingTool: boolean;
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
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an unexpected error
 *   is encountered. Note: This is NOT called for aborted requests (see `stop()`).
 * @param options.chatProvider - The provider to use for chat completions (default: "api").
 * @param options.localModel - The model to use for local chat completions.
 * @param options.tools - Client-side tools that can be executed in the browser.
 * @param options.toolSelectorModel - The model to use for tool selection.
 * @param options.onToolExecution - Callback function to be called when a tool is executed.
 *
 * @returns An object containing:
 *   - `isLoading`: A boolean indicating whether a request is currently in progress
 *   - `isSelectingTool`: A boolean indicating whether tool selection is in progress
 *   - `sendMessage`: An async function to send chat messages
 *   - `stop`: A function to abort the current request
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
 * // With client-side tools
 * const { isLoading, isSelectingTool, sendMessage } = useChat({
 *   getToken: async () => await getAuthToken(),
 *   tools: [
 *     {
 *       name: "get_weather",
 *       description: "Get the current weather for a location",
 *       parameters: [
 *         { name: "location", type: "string", description: "City name", required: true }
 *       ],
 *       execute: async ({ location }) => {
 *         // Your weather API call here
 *         return { temperature: 72, condition: "sunny" };
 *       }
 *     }
 *   ],
 *   onToolExecution: (result) => {
 *     console.log("Tool executed:", result.toolName, result.result);
 *   }
 * });
 *
 * const handleSend = async () => {
 *   const result = await sendMessage({
 *     messages: [{ role: 'user', content: 'What is the weather in Paris?' }],
 *     model: 'gpt-4o-mini'
 *   });
 *
 *   if (result.toolExecution) {
 *     console.log("Tool was called:", result.toolExecution);
 *   }
 * };
 * ```
 */
export function useChat(options?: UseChatOptions): UseChatResult {
  const {
    getToken,
    baseUrl = BASE_URL,
    onData: globalOnData,
    onFinish,
    onError,
    chatProvider = "api",
    localModel,
    tools,
    toolSelectorModel,
    onToolExecution,
  } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectingTool, setIsSelectingTool] = useState(false);
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

  // Preload tool selector model when tools are configured
  // The preload function handles deduplication at module level
  useEffect(() => {
    if (tools && tools.length > 0) {
      preloadToolSelectorModel({
        model: toolSelectorModel || DEFAULT_TOOL_SELECTOR_MODEL,
      });
    }
  }, [tools, toolSelectorModel]);

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onData,
      runTools = true,
      headers,
    }: SendMessageArgs): Promise<SendMessageResult> => {
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

      // Tool selection and execution (requires @huggingface/transformers)
      let toolExecutionResult: ToolExecutionResult | undefined;
      let messagesWithToolContext = messages;

      // Run tool selection if tools are configured and runTools is enabled
      const shouldRunTools = runTools && tools && tools.length > 0;

      if (shouldRunTools) {
        // Get the last user message for tool selection
        const lastUserMessage = [...messages]
          .reverse()
          .find((m) => m.role === "user");

        if (lastUserMessage?.content) {
          setIsSelectingTool(true);

          // Extract text content from the message parts
          const contentString =
            lastUserMessage.content?.map((part) => part.text || "").join("") ||
            "";

          try {
            const selectionResult = await selectTool(contentString, tools, {
              model: toolSelectorModel || DEFAULT_TOOL_SELECTOR_MODEL,
              signal: abortController.signal,
            });

            if (selectionResult.toolSelected && selectionResult.toolName) {
              const selectedTool = tools.find(
                (t) => t.name === selectionResult.toolName
              );

              if (selectedTool) {
                const execResult = await executeTool(
                  selectedTool,
                  selectionResult.parameters || {}
                );

                toolExecutionResult = {
                  toolName: selectionResult.toolName,
                  success: execResult.success,
                  result: execResult.result,
                  error: execResult.error,
                };

                if (onToolExecution) {
                  onToolExecution(toolExecutionResult);
                }

                // Include tool result as context in the messages sent to the LLM
                if (
                  toolExecutionResult.success &&
                  toolExecutionResult.result !== undefined
                ) {
                  const toolResultContext: LlmapiMessage = {
                    role: "system",
                    content: [
                      {
                        type: "text",
                        text: `Tool "${
                          toolExecutionResult.toolName
                        }" was executed with the following result:\n${JSON.stringify(
                          toolExecutionResult.result,
                          null,
                          2
                        )}\n\nUse this information to respond to the user's request.`,
                      },
                    ],
                  };
                  messagesWithToolContext = [...messages, toolResultContext];
                } else if (toolExecutionResult.error) {
                  const toolErrorContext: LlmapiMessage = {
                    role: "system",
                    content: [
                      {
                        type: "text",
                        text: `Tool "${toolExecutionResult.toolName}" was executed but encountered an error: ${toolExecutionResult.error}\n\nPlease inform the user about this issue and try to help them alternatively.`,
                      },
                    ],
                  };
                  messagesWithToolContext = [...messages, toolErrorContext];
                }
              }
            }
          } catch (err) {
            // Check if this was an abort - if so, return early
            if (isAbortError(err)) {
              setIsLoading(false);
              setIsSelectingTool(false);
              return {
                data: null,
                error: "Request aborted",
                toolExecution: toolExecutionResult,
              };
            }
            // Other tool selection errors are non-fatal, continue with chat
            console.warn("Tool selection error:", err);
          } finally {
            setIsSelectingTool(false);
          }
        }
      }

      // Check if aborted before proceeding to chat
      if (abortController.signal.aborted) {
        setIsLoading(false);
        return {
          data: null,
          error: "Request aborted",
          toolExecution: toolExecutionResult,
        };
      }

      try {
        if (chatProvider === "local") {
          let accumulatedContent = "";
          // For local provider, always use localModel (ignore the model param which is for API)
          const usedModel = localModel || DEFAULT_LOCAL_CHAT_MODEL;

          // Convert messages to format expected by transformers.js if needed
          // Assuming it takes { role: string, content: string }[] which matches LlmapiMessage
          const formattedMessages = messagesWithToolContext.map((m) => ({
            role: m.role || "user",
            content: m.content?.map((p) => p.text || "").join("") || "",
          }));

          await generateLocalChatCompletion(formattedMessages, {
            model: usedModel,
            signal: abortController.signal,
            onToken: (token) => {
              accumulatedContent += token;
              if (onData) onData(token);
              if (globalOnData) globalOnData(token);
            },
          });

          const completion: LlmapiChatCompletionResponse = {
            id: `local-${Date.now()}`,
            model: usedModel,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: [{ type: "text", text: accumulatedContent }],
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 0, // Not easily available from simple pipeline usage
              completion_tokens: 0,
              total_tokens: 0,
            },
          };

          setIsLoading(false);
          if (onFinish) {
            onFinish(completion);
          }
          return {
            data: completion,
            error: null,
            toolExecution: toolExecutionResult,
          };
        } else {
          // API Provider - validate model and token
          const modelValidation = validateModel(model);
          if (!modelValidation.valid) {
            setIsLoading(false);
            if (onError) onError(new Error(modelValidation.message));
            return {
              data: null,
              error: modelValidation.message,
              toolExecution: toolExecutionResult,
            };
          }

          const tokenGetterValidation = validateTokenGetter(getToken);
          if (!tokenGetterValidation.valid) {
            setIsLoading(false);
            if (onError) onError(new Error(tokenGetterValidation.message));
            return {
              data: null,
              error: tokenGetterValidation.message,
              toolExecution: toolExecutionResult,
            };
          }

          const token = await getToken!();

          const tokenValidation = validateToken(token);
          if (!tokenValidation.valid) {
            setIsLoading(false);
            if (onError) onError(new Error(tokenValidation.message));
            return {
              data: null,
              error: tokenValidation.message,
              toolExecution: toolExecutionResult,
            };
          }

          // Use SSE client for streaming
          const sseResult = await client.sse.post({
            baseUrl,
            url: "/api/v1/chat/completions",
            body: {
              messages: messagesWithToolContext,
              model,
              stream: true,
            },
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...headers,
            },
            signal: abortController.signal,
          });

          const accumulator = createStreamAccumulator();

          for await (const chunk of sseResult.stream) {
            // Skip [DONE] marker
            if (isDoneMarker(chunk)) {
              continue;
            }

            // Handle chunk data
            if (chunk && typeof chunk === "object") {
              const contentDelta = processStreamingChunk(
                chunk as StreamingChunk,
                accumulator
              );
              if (contentDelta) {
                if (onData) onData(contentDelta);
                if (globalOnData) globalOnData(contentDelta);
              }
            }
          }

          // Build the final response
          const completion = buildCompletionResponse(accumulator);

          setIsLoading(false);
          if (onFinish) {
            onFinish(completion);
          }
          return {
            data: completion,
            error: null,
            toolExecution: toolExecutionResult,
          };
        }
      } catch (err) {
        // Handle AbortError specifically - aborts are intentional user actions,
        // not errors, so we don't trigger onError callback
        if (isAbortError(err)) {
          setIsLoading(false);
          return {
            data: null,
            error: "Request aborted",
            toolExecution: toolExecutionResult,
          };
        }

        const errorResult = handleError<{
          data: null;
          error: string;
        }>(err, onError);
        setIsLoading(false);
        return {
          ...errorResult,
          toolExecution: toolExecutionResult,
        };
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
      onFinish,
      onError,
      chatProvider,
      localModel,
      tools,
      toolSelectorModel,
      onToolExecution,
    ]
  );

  return {
    isLoading,
    isSelectingTool,
    sendMessage,
    stop,
  };
}
