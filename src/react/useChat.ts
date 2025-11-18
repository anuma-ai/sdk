"use client";

import { useCallback, useState } from "react";

import {
  postApiV1ChatCompletions,
  type LlmapiChatCompletionResponse,
  type LlmapiMessage,
} from "../client";

type SendMessageArgs = {
  messages: LlmapiMessage[];
  model: string;
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

        const completion = await postApiV1ChatCompletions({
          body: {
            messages,
            model,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!completion.data) {
          const error =
            completion.error?.error ??
            "API did not return a completion response.";
          setIsLoading(false);
          return { data: null, error };
        }

        setIsLoading(false);
        return { data: completion.data, error: null };
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
