"use client";

import { useCallback, useState } from "react";

import { client } from "../client/client.gen";
import type { LlmapiChatCompletionResponse, LlmapiMessage } from "../client";

type SendMessageArgs = {
  messages: LlmapiMessage[];
  model: string;
  onChunk?: (chunk: string) => void;
};

type SendMessageResult =
  | { data: LlmapiChatCompletionResponse; error: null }
  | { data: null; error: string };

type UseChatOptions = {
  getToken?: () => Promise<string | null>;
};

type UseChatResult = {
  isLoading: boolean;
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
 *
 * @returns An object containing:
 *   - `isLoading`: A boolean indicating whether a request is currently in progress
 *   - `sendMessage`: An async function to send chat messages
 *
 * @example
 * ```tsx
 * const { isLoading, sendMessage } = useChat({
 *   getToken: async () => {
 *     // Get your auth token from your auth provider
 *     return await getAuthToken();
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
 *     console.error(result.error);
 *   } else {
 *     console.log(result.data);
 *   }
 * };
 * ```
 */
export function useChat(options?: UseChatOptions): UseChatResult {
  const { getToken } = options || {};
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onChunk,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      if (!messages?.length) {
        const error = "messages are required to call sendMessage.";
        return { data: null, error };
      }

      if (!model) {
        const error = "model is required to call sendMessage.";
        return { data: null, error };
      }

      if (!getToken) {
        const error = "Token getter function is required.";
        return { data: null, error };
      }

      setIsLoading(true);

      try {
        const token = await getToken();

        if (!token) {
          const error = "No access token available.";
          setIsLoading(false);
          return { data: null, error };
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
                if (onChunk) {
                  onChunk(content);
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
        return { data: completion, error: null };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to send message.";
        setIsLoading(false);
        return { data: null, error };
      }
    },
    [getToken]
  );

  return {
    isLoading,
    sendMessage,
  };
}
