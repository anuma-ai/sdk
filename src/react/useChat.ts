"use client";

import { useCallback, useRef, useState } from "react";

import { client } from "../client/client.gen";
import type { LlmapiChatCompletionResponse, LlmapiMessage } from "../client";

type SendMessageArgs = {
  messages: LlmapiMessage[];
  model: string;
  onData?: (chunk: string) => void;
};

type SendMessageResult =
  | { data: LlmapiChatCompletionResponse; error: null }
  | { data: null; error: string };

type UseChatOptions = {
  getToken?: () => Promise<string | null>;
  /**
   * Callback function to be called when a new data chunk is received.
   */
  onData?: (chunk: string) => void;
  /**
   * Callback function to be called when the chat completion finishes successfully.
   */
  onFinish?: (response: LlmapiChatCompletionResponse) => void;
  /**
   * Callback function to be called when an error is encountered.
   */
  onError?: (error: Error) => void;
};

type UseChatResult = {
  isLoading: boolean;
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
  stop: () => void;
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
 * @param options.onData - Callback function to be called when a new data chunk is received.
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an error is encountered.
 *
 * @returns An object containing:
 *   - `isLoading`: A boolean indicating whether a request is currently in progress
 *   - `sendMessage`: An async function to send chat messages
 *   - `stop`: A function to abort the current request
 *
 * @example
 * ```tsx
 * const { isLoading, sendMessage, stop } = useChat({
 *   getToken: async () => {
 *     // Get your auth token from your auth provider
 *     return await getAuthToken();
 *   },
 *   onFinish: (response) => {
 *     console.log("Chat finished:", response);
 *   },
 *   onError: (error) => {
 *     console.error("Chat error:", error);
 *   }
 * });
 *
 * const handleSend = async () => {
 *   const result = await sendMessage({
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *     model: 'gpt-4o-mini'
 *   });
 *
 *   // result.data is also available here
 * };
 *
 * // To stop generation:
 * // stop();
 * ```
 */
export function useChat(options?: UseChatOptions): UseChatResult {
  const { getToken, onData: globalOnData, onFinish, onError } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onData,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      if (!messages?.length) {
        const errorMsg = "messages are required to call sendMessage.";
        if (onError) onError(new Error(errorMsg));
        return { data: null, error: errorMsg };
      }

      if (!model) {
        const errorMsg = "model is required to call sendMessage.";
        if (onError) onError(new Error(errorMsg));
        return { data: null, error: errorMsg };
      }

      if (!getToken) {
        const errorMsg = "Token getter function is required.";
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

      try {
        const token = await getToken();

        if (!token) {
          const errorMsg = "No access token available.";
          setIsLoading(false);
          if (onError) onError(new Error(errorMsg));
          return { data: null, error: errorMsg };
        }

        // Use SSE client for streaming
        const sseResult = await client.sse.post({
          url: "/api/v1/chat/completions",
          body: {
            messages,
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
        let usage: LlmapiChatCompletionResponse["usage"] | undefined;
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
            const chunkData = chunk as any;

            // Extract completion ID and model from first chunk
            if (chunkData.id && !completionId) {
              completionId = chunkData.id;
            }
            if (chunkData.model && !completionModel) {
              completionModel = chunkData.model;
            }

            // Extract usage from final chunk
            if (chunkData.usage) {
              usage = chunkData.usage;
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
                content: accumulatedContent,
              },
              finish_reason: finishReason,
            },
          ],
          usage,
        };

        setIsLoading(false);
        if (onFinish) {
          onFinish(completion);
        }
        return { data: completion, error: null };
      } catch (err) {
        // Handle AbortError specifically
        if (err instanceof Error && err.name === "AbortError") {
          setIsLoading(false);
          const errorMsg = "Request aborted";
          // Abort errors are generally not considered "errors" in the same way, but let's return it.
          // We might not want to trigger onError for aborts, or maybe we do.
          // Vercel usually doesn't trigger onError for manual stops.
          return { data: null, error: errorMsg };
        }

        const errorMsg =
          err instanceof Error ? err.message : "Failed to send message.";
        const errorObj = err instanceof Error ? err : new Error(errorMsg);

        setIsLoading(false);
        if (onError) {
          onError(errorObj);
        }
        return { data: null, error: errorMsg };
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [getToken, globalOnData, onFinish, onError]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
