"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../clientConfig";
import type {
  LlmapiChatCompletionResponse,
  LlmapiChatCompletionUsage,
  LlmapiMessage,
} from "../client";

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
};

type SendMessageResult =
  | {
      data: LlmapiChatCompletionResponse;
      error: null;
    }
  | { data: null; error: string };

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
    onFinish,
    onError,
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

        // Use XMLHttpRequest for streaming in React Native
        // (fetch doesn't support response.body streaming in RN)
        const result = await new Promise<SendMessageResult>((resolve) => {
          const xhr = new XMLHttpRequest();
          const url = `${baseUrl}/api/v1/chat/completions`;

          let accumulatedContent = "";
          let completionId = "";
          let completionModel = "";
          let accumulatedUsage: Partial<LlmapiChatCompletionUsage> = {};
          let finishReason: string | undefined;
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

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.substring(6).trim();
                if (data === "[DONE]") continue;

                try {
                  const chunk = JSON.parse(data) as StreamingChunk;

                  if (chunk.id && !completionId) {
                    completionId = chunk.id;
                  }
                  if (chunk.model && !completionModel) {
                    completionModel = chunk.model;
                  }
                  if (chunk.usage) {
                    accumulatedUsage = { ...accumulatedUsage, ...chunk.usage };
                  }

                  if (chunk.choices?.[0]) {
                    const choice = chunk.choices[0];
                    if (choice.delta?.content) {
                      const content = choice.delta.content;
                      accumulatedContent += content;
                      if (onData) onData(content);
                      if (globalOnData) globalOnData(content);
                    }
                    if (choice.finish_reason) {
                      finishReason = choice.finish_reason;
                    }
                  }
                } catch {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          };

          xhr.onload = () => {
            abortController.signal.removeEventListener("abort", abortHandler);

            // Process any remaining data in the buffer
            if (incompleteLineBuffer) {
              const line = incompleteLineBuffer.trim();
              if (line.startsWith("data: ")) {
                const data = line.substring(6).trim();
                if (data !== "[DONE]") {
                  try {
                    const chunk = JSON.parse(data) as StreamingChunk;

                    if (chunk.id && !completionId) {
                      completionId = chunk.id;
                    }
                    if (chunk.model && !completionModel) {
                      completionModel = chunk.model;
                    }
                    if (chunk.usage) {
                      accumulatedUsage = {
                        ...accumulatedUsage,
                        ...chunk.usage,
                      };
                    }

                    if (chunk.choices?.[0]) {
                      const choice = chunk.choices[0];
                      if (choice.delta?.content) {
                        const content = choice.delta.content;
                        accumulatedContent += content;
                        if (onData) onData(content);
                        if (globalOnData) globalOnData(content);
                      }
                      if (choice.finish_reason) {
                        finishReason = choice.finish_reason;
                      }
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
              }
              incompleteLineBuffer = "";
            }

            if (xhr.status >= 200 && xhr.status < 300) {
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
              if (onFinish) onFinish(completion);
              resolve({ data: completion, error: null });
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

          xhr.send(
            JSON.stringify({
              messages,
              model,
              stream: true,
            })
          );
        });

        return result;
      } catch (err) {
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
    [getToken, baseUrl, globalOnData, onFinish, onError]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
