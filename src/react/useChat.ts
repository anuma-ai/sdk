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

type UseChatOptions = {
  getToken?: () => Promise<string | null>;
};

type UseChatResult = {
  error: string | null;
  isLoading: boolean;
  sendMessage: (args: SendMessageArgs) => Promise<LlmapiChatCompletionResponse>;
};

export function useChat(options?: UseChatOptions): UseChatResult {
  const { getToken } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async ({ messages, model }: SendMessageArgs) => {
      if (!messages?.length) {
        throw new Error("messages are required to call sendMessage.");
      }

      if (!model) {
        throw new Error("model is required to call sendMessage.");
      }

      if (!getToken) {
        throw new Error("Token getter function is required.");
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("No access token available.");
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
          const message =
            completion.error?.error ??
            "API did not return a completion response.";
          throw new Error(message);
        }

        return completion.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send message.";
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  return {
    error,
    isLoading,
    sendMessage,
  };
}
