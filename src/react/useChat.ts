"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { client } from "../client/client.gen";
import type { LlmapiChatCompletionResponse, LlmapiMessage } from "../client";

type SendMessageArgs = {
  messages: LlmapiMessage[];
  model: string;
  /**
   * Per-request callback for data chunks. Called in addition to the global
   * `onData` callback if provided in `useChat` options.
   * 
   * @param chunk - The content delta from the current chunk
   */
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
};

type UseChatResult = {
  isLoading: boolean;
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
 * @param options.onData - Callback function to be called when a new data chunk is received.
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an unexpected error
 *   is encountered. Note: This is NOT called for aborted requests (see `stop()`).
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
 *     // This is only called for unexpected errors, not aborts
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
 *   if (result.error) {
 *     if (result.error === "Request aborted") {
 *       console.log("Request was aborted");
 *     } else {
 *       console.error("Error:", result.error);
 *     }
 *   } else {
 *     console.log("Success:", result.data);
 *   }
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
            const chunkData = chunk as StreamingChunk;

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
        // Handle AbortError specifically - aborts are intentional user actions,
        // not errors, so we don't trigger onError callback (consistent with
        // Vercel AI SDK and React Query patterns)
        if (err instanceof Error && err.name === "AbortError") {
          setIsLoading(false);
          return { data: null, error: "Request aborted" };
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
