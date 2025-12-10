"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../clientConfig";
import {
  type BaseSendMessageArgs,
  type BaseSendMessageResult,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  type StreamAccumulator,
  type StreamingChunk,
  createStreamAccumulator,
  validateMessages,
  validateModel,
  validateTokenGetter,
  validateToken,
  buildCompletionResponse,
  createErrorResult,
  handleError,
  parseSSEDataLine,
} from "../lib/chat/useChat";

type SendMessageArgs = BaseSendMessageArgs;

type SendMessageResult = BaseSendMessageResult;

type UseChatOptions = BaseUseChatOptions;

type UseChatResult = BaseUseChatResult & {
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
};

/**
 * Processes SSE lines and updates the accumulator
 * Returns true if any content was processed
 */
function processSSELines(
  lines: string[],
  accumulator: StreamAccumulator,
  onData?: (chunk: string) => void,
  globalOnData?: (chunk: string) => void,
): void {
  for (const line of lines) {
    const chunk = parseSSEDataLine(line);
    if (!chunk) continue;

    if (chunk.id && !accumulator.completionId) {
      accumulator.completionId = chunk.id;
    }
    if (chunk.model && !accumulator.completionModel) {
      accumulator.completionModel = chunk.model;
    }
    if (chunk.usage) {
      accumulator.usage = { ...accumulator.usage, ...chunk.usage };
    }

    if (chunk.choices?.[0]) {
      const choice = chunk.choices[0];
      if (choice.delta?.content) {
        const content = choice.delta.content;
        accumulator.content += content;
        if (onData) onData(content);
        if (globalOnData) globalOnData(content);
      }
      if (choice.finish_reason) {
        accumulator.finishReason = choice.finish_reason;
      }
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

        // Use XMLHttpRequest for streaming in React Native
        // (fetch doesn't support response.body streaming in RN)
        const result = await new Promise<SendMessageResult>((resolve) => {
          const xhr = new XMLHttpRequest();
          const url = `${baseUrl}/api/v1/chat/completions`;

          const accumulator = createStreamAccumulator();
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

            processSSELines(lines, accumulator, onData, globalOnData);
          };

          xhr.onload = () => {
            abortController.signal.removeEventListener("abort", abortHandler);

            // Process any remaining data in the buffer
            if (incompleteLineBuffer) {
              processSSELines(
                [incompleteLineBuffer.trim()],
                accumulator,
                onData,
                globalOnData,
              );
              incompleteLineBuffer = "";
            }

            if (xhr.status >= 200 && xhr.status < 300) {
              const completion = buildCompletionResponse(accumulator);
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
            }),
          );
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
    [getToken, baseUrl, globalOnData, onFinish, onError],
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
