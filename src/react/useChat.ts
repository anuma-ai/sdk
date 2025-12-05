"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Import polyfills for React Native compatibility (TextDecoderStream, etc.)
import "../lib/polyfills";

import { client } from "../client/client.gen";
import { BASE_URL } from "../clientConfig";
import type { LlmapiChatCompletionResponse, LlmapiMessage } from "../client";
import type { ClientTool, ToolExecutionResult } from "../lib/tools/types";

// Detect React Native environment
const isReactNative =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

// Web-only features container (not available in React Native)
// These use dynamic imports to avoid bundling issues in React Native
type WebFeatures = {
  generateLocalChatCompletion: typeof import("../lib/chat/generation").generateLocalChatCompletion;
  DEFAULT_LOCAL_CHAT_MODEL: string;
  selectTool: typeof import("../lib/tools/selector").selectTool;
  executeTool: typeof import("../lib/tools/selector").executeTool;
  preloadToolSelectorModel: typeof import("../lib/tools/selector").preloadToolSelectorModel;
  DEFAULT_TOOL_SELECTOR_MODEL: string;
};

let webFeatures: WebFeatures | null = null;

// Only load web-specific features when not in React Native
const webFeaturesPromise: Promise<WebFeatures | null> = isReactNative
  ? Promise.resolve(null)
  : Promise.all([
      import("../lib/chat/generation"),
      import("../lib/chat/constants"),
      import("../lib/tools/selector"),
    ]).then(([generation, constants, selector]) => {
      webFeatures = {
        generateLocalChatCompletion: generation.generateLocalChatCompletion,
        DEFAULT_LOCAL_CHAT_MODEL: constants.DEFAULT_LOCAL_CHAT_MODEL,
        selectTool: selector.selectTool,
        executeTool: selector.executeTool,
        preloadToolSelectorModel: selector.preloadToolSelectorModel,
        DEFAULT_TOOL_SELECTOR_MODEL: selector.DEFAULT_TOOL_SELECTOR_MODEL,
      };
      return webFeatures;
    });

type SendMessageArgs = {
  messages: LlmapiMessage[];
  model?: string;
  /**
   * Per-request callback for data chunks. Called in addition to the global
   * `onData` callback if provided in `useChat` options.
   *
   * @param chunk - The content delta from the current chunk
   */
  onData?: (chunk: string) => void;
  /**
   * Whether to run tool selection for this message.
   * Defaults to true if tools are configured.
   */
  runTools?: boolean;
};

type SendMessageResult =
  | {
      data: LlmapiChatCompletionResponse;
      error: null;
      toolExecution?: ToolExecutionResult;
    }
  | { data: null; error: string; toolExecution?: ToolExecutionResult };

type UseChatOptions = {
  getToken?: () => Promise<string | null>;
  baseUrl?: string;
  /**
   * Callback function to be called when a new data chunk is received.
   */
  onData?: (chunk: string) => void;
  /**
   * Callback function to be called when the chat completion finishes successfully.
   */
  onFinish?: (response: LlmapiChatCompletionResponse) => void;
  /**
   * Callback function to be called when an unexpected error is encountered.
   *
   * **Note:** This callback is NOT called for aborted requests (via `stop()` or
   * component unmount). Aborts are intentional actions and are not considered
   * errors. To detect aborts, check the `error` field in the `sendMessage` result:
   * `result.error === "Request aborted"`.
   *
   * @param error - The error that occurred (never an AbortError)
   */
  onError?: (error: Error) => void;
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

type UseChatResult = {
  isLoading: boolean;
  isSelectingTool: boolean;
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
  /**
   * Aborts the current streaming request if one is in progress.
   *
   * When a request is aborted, `sendMessage` will return with
   * `{ data: null, error: "Request aborted" }`. The `onError` callback
   * will NOT be called, as aborts are intentional actions, not errors.
   */
  stop: () => void;
};

type StreamingChunk = {
  id?: string;
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      role?: string;
    };
    finish_reason?: string;
    index?: number;
  }>;
  usage?: LlmapiChatCompletionResponse["usage"];
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
  const [webFeaturesLoaded, setWebFeaturesLoaded] = useState(false);
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

  // Load web features (local chat, tools) if not in React Native
  useEffect(() => {
    webFeaturesPromise?.then((loaded) => {
      if (loaded) setWebFeaturesLoaded(true);
    });
  }, []);

  // Preload tool selector model when tools are configured (web only)
  // The preload function handles deduplication at module level
  useEffect(() => {
    if (
      !isReactNative &&
      webFeaturesLoaded &&
      webFeatures &&
      tools &&
      tools.length > 0
    ) {
      webFeatures.preloadToolSelectorModel({
        model: toolSelectorModel || webFeatures.DEFAULT_TOOL_SELECTOR_MODEL,
      });
    }
  }, [tools, toolSelectorModel, webFeaturesLoaded]);

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onData,
      runTools = true,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      if (!messages?.length) {
        const errorMsg = "messages are required to call sendMessage.";
        if (onError) onError(new Error(errorMsg));
        return { data: null, error: errorMsg };
      }

      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      // Tool selection and execution (web only - requires @huggingface/transformers)
      let toolExecutionResult: ToolExecutionResult | undefined;
      let messagesWithToolContext = messages;

      // Only run tool selection if:
      // 1. Not in React Native
      // 2. Web features are loaded
      // 3. Tools are configured
      // 4. runTools is enabled
      const canRunTools =
        !isReactNative &&
        webFeaturesLoaded &&
        webFeatures !== null &&
        runTools &&
        tools &&
        tools.length > 0;

      if (canRunTools && webFeatures) {
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
            const selectionResult = await webFeatures.selectTool(
              contentString,
              tools,
              {
                model:
                  toolSelectorModel || webFeatures.DEFAULT_TOOL_SELECTOR_MODEL,
                signal: abortController.signal,
              }
            );

            if (selectionResult.toolSelected && selectionResult.toolName) {
              const selectedTool = tools.find(
                (t) => t.name === selectionResult.toolName
              );

              if (selectedTool) {
                const execResult = await webFeatures.executeTool(
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
            // Tool selection errors are non-fatal, continue with chat
            console.warn("Tool selection error:", err);
          } finally {
            setIsSelectingTool(false);
          }
        }
      }

      try {
        if (chatProvider === "local") {
          // Local chat provider is not available in React Native
          if (isReactNative || !webFeaturesLoaded || !webFeatures) {
            const errorMsg =
              'Local chat provider is not available in React Native. Use chatProvider: "api" instead.';
            setIsLoading(false);
            if (onError) onError(new Error(errorMsg));
            return {
              data: null,
              error: errorMsg,
              toolExecution: toolExecutionResult,
            };
          }

          let accumulatedContent = "";
          // For local provider, always use localModel (ignore the model param which is for API)
          const usedModel = localModel || webFeatures.DEFAULT_LOCAL_CHAT_MODEL;

          // Convert messages to format expected by transformers.js if needed
          // Assuming it takes { role: string, content: string }[] which matches LlmapiMessage
          const formattedMessages = messagesWithToolContext.map((m) => ({
            role: m.role || "user",
            content: m.content?.map((p) => p.text || "").join("") || "",
          }));

          await webFeatures.generateLocalChatCompletion(formattedMessages, {
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
          // API Provider
          if (!model) {
            const errorMsg = "model is required to call sendMessage.";
            if (onError) onError(new Error(errorMsg));
            return {
              data: null,
              error: errorMsg,
              toolExecution: toolExecutionResult,
            };
          }

          if (!getToken) {
            const errorMsg = "Token getter function is required.";
            if (onError) onError(new Error(errorMsg));
            return {
              data: null,
              error: errorMsg,
              toolExecution: toolExecutionResult,
            };
          }

          const token = await getToken();

          if (!token) {
            const errorMsg = "No access token available.";
            setIsLoading(false);
            if (onError) onError(new Error(errorMsg));
            return {
              data: null,
              error: errorMsg,
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
            },
            signal: abortController.signal,
          });

          let accumulatedContent = "";
          let completionId = "";
          let completionModel = "";
          // Accumulate usage data from all chunks (merge instead of overwrite)
          // This fixes the issue where token counts come in one chunk and cost in another
          let accumulatedUsage: Partial<LlmapiChatCompletionResponse["usage"]> =
            {};
          let finishReason: string | undefined;

          for await (const chunk of sseResult.stream) {
            // Skip [DONE] marker (can come as string or in various formats)
            if (
              typeof chunk === "string" &&
              (chunk.trim() === "[DONE]" || chunk.includes("[DONE]"))
            ) {
              continue;
            }

            // Handle chunk data
            if (chunk && typeof chunk === "object") {
              const chunkData = chunk as StreamingChunk;

              // Extract completion ID and model from first chunk
              if (chunkData.id && !completionId) {
                completionId = chunkData.id;
              }
              if (chunkData.model && !completionModel) {
                completionModel = chunkData.model;
              }

              // Accumulate usage data - merge instead of replace
              // This ensures we capture both token counts (from first usage chunk)
              // and cost_micro_usd (from final usage chunk)
              if (chunkData.usage) {
                accumulatedUsage = {
                  ...accumulatedUsage,
                  ...chunkData.usage,
                };
              }

              // Extract content delta
              if (
                chunkData.choices &&
                Array.isArray(chunkData.choices) &&
                chunkData.choices.length > 0
              ) {
                const choice = chunkData.choices[0];
                if (choice.delta?.content) {
                  const content = choice.delta.content;
                  accumulatedContent += content;
                  if (onData) {
                    onData(content);
                  }
                  if (globalOnData) {
                    globalOnData(content);
                  }
                }
                if (choice.finish_reason) {
                  finishReason = choice.finish_reason;
                }
              }
            }
          }

          // Build the final response
          const completion: LlmapiChatCompletionResponse = {
            id: completionId,
            model: completionModel,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: [{ type: "text", text: accumulatedContent }],
                },
                finish_reason: finishReason,
              },
            ],
            usage:
              Object.keys(accumulatedUsage).length > 0
                ? (accumulatedUsage as LlmapiChatCompletionResponse["usage"])
                : undefined,
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
        }
      } catch (err) {
        // Handle AbortError specifically - aborts are intentional user actions,
        // not errors, so we don't trigger onError callback (consistent with
        // Vercel AI SDK and React Query patterns)
        if (err instanceof Error && err.name === "AbortError") {
          setIsLoading(false);
          return {
            data: null,
            error: "Request aborted",
            toolExecution: toolExecutionResult,
          };
        }

        const errorMsg =
          err instanceof Error ? err.message : "Failed to send message.";
        const errorObj = err instanceof Error ? err : new Error(errorMsg);

        setIsLoading(false);
        if (onError) {
          onError(errorObj);
        }
        return {
          data: null,
          error: errorMsg,
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
      webFeaturesLoaded,
    ]
  );

  return {
    isLoading,
    isSelectingTool,
    sendMessage,
    stop,
  };
}
