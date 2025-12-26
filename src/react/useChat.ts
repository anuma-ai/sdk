"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { client } from "../client/client.gen";
import { BASE_URL } from "../clientConfig";
import type { LlmapiMessage, LlmapiResponseResponse } from "../client";
import {
  type BaseSendMessageArgs,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  type StreamingChunk,
  type ProcessChunkResult,
  createStreamAccumulator,
  validateMessages,
  validateModel,
  validateTokenGetter,
  validateToken,
  buildResponseResponse,
  processStreamingChunk,
  createErrorResult,
  handleError,
  isAbortError,
  isDoneMarker,
  messagesToInput,
} from "../lib/chat/useChat";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Optional custom headers to include with the request.
   */
  headers?: Record<string, string>;
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
  /**
   * Per-request callback for thinking/reasoning chunks. Called in addition to the global
   * `onThinking` callback if provided in `useChat` options.
   *
   * @param chunk - The thinking delta from the current chunk
   */
  onThinking?: (chunk: string) => void;
};

type SendMessageResult =
  | {
      data: LlmapiResponseResponse;
      error: null;
    }
  | {
      data: LlmapiResponseResponse | null;
      error: string;
    };

type UseChatOptions = BaseUseChatOptions;

type UseChatResult = BaseUseChatResult & {
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
 * @param options.onThinking - Callback function to be called when thinking/reasoning content is received.
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an unexpected error
 *   is encountered. Note: This is NOT called for aborted requests (see `stop()`).
 *
 * @category Hooks
 *
 * @returns An object containing:
 *   - `isLoading`: A boolean indicating whether a request is currently in progress
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
 * const handleSend = async () => {
 *   const result = await sendMessage({
 *     messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }],
 *     model: 'gpt-4o-mini'
 *   });
 * };
 *
 * // Using extended thinking (Anthropic Claude)
 * const result = await sendMessage({
 *   messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve this complex problem...' }] }],
 *   model: 'anthropic/claude-3-7-sonnet-20250219',
 *   thinking: { type: 'enabled', budget_tokens: 10000 },
 *   onThinking: (chunk) => console.log('Thinking:', chunk)
 * });
 *
 * // Using reasoning (OpenAI o-series)
 * const result = await sendMessage({
 *   messages: [{ role: 'user', content: [{ type: 'text', text: 'Reason through this...' }] }],
 *   model: 'openai/o1',
 *   reasoning: { effort: 'high', summary: 'detailed' }
 * });
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
  } = options || {};
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
      onThinking,
      headers,
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

      // Check if aborted before proceeding to chat
      if (abortController.signal.aborted) {
        setIsLoading(false);
        return {
          data: null,
          error: "Request aborted",
        };
      }

      try {
        // Validate model and token
        const modelValidation = validateModel(model);
        if (!modelValidation.valid) {
          setIsLoading(false);
          if (onError) onError(new Error(modelValidation.message));
          return {
            data: null,
            error: modelValidation.message,
          };
        }

        const tokenGetterValidation = validateTokenGetter(getToken);
        if (!tokenGetterValidation.valid) {
          setIsLoading(false);
          if (onError) onError(new Error(tokenGetterValidation.message));
          return {
            data: null,
            error: tokenGetterValidation.message,
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
          };
        }

        // Use SSE client for streaming
        // Track SSE errors to surface them after streaming completes
        let sseError: Error | null = null;

        const sseResult = await client.sse.post({
          baseUrl,
          url: "/api/v1/responses",
          body: {
            input: messagesToInput(messagesWithContext),
            model,
            stream: true,
            // Responses API options (only include if defined)
            ...(store !== undefined && { store }),
            ...(previousResponseId && { previous_response_id: previousResponseId }),
            ...(conversation && { conversation }),
            ...(temperature !== undefined && { temperature }),
            ...(maxOutputTokens !== undefined && { max_output_tokens: maxOutputTokens }),
            ...(tools && { tools }),
            ...(toolChoice && { tool_choice: toolChoice }),
            ...(reasoning && { reasoning }),
            ...(thinking && { thinking }),
          },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...headers,
          },
          signal: abortController.signal,
          sseMaxRetryAttempts: 1,
          onSseError: (error) => {
            sseError =
              error instanceof Error ? error : new Error(String(error));
          },
        });

        const accumulator = createStreamAccumulator();

        try {
          for await (const chunk of sseResult.stream) {
            // Skip [DONE] marker
            if (isDoneMarker(chunk)) {
              continue;
            }

            // Handle chunk data
            if (chunk && typeof chunk === "object") {
              const { content: contentDelta, thinking: thinkingDelta } = processStreamingChunk(
                chunk as StreamingChunk,
                accumulator
              );
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
        } catch (streamErr) {
          // Check if this was an abort during streaming
          if (isAbortError(streamErr) || abortController.signal.aborted) {
            setIsLoading(false);
            // Return partial data so far
            const partialResponse = buildResponseResponse(accumulator);
            return {
              data: partialResponse,
              error: "Request aborted",
            };
          }
          throw streamErr;
        }

        // Check if abort happened during streaming but loop completed before throw
        if (abortController.signal.aborted) {
          setIsLoading(false);
          const partialResponse = buildResponseResponse(accumulator);
          return {
            data: partialResponse,
            error: "Request aborted",
          };
        }

        // Check if SSE encountered an error
        if (sseError) {
          throw sseError;
        }

        // Build the final response
        const response = buildResponseResponse(accumulator);

        setIsLoading(false);
        if (onFinish) {
          onFinish(response);
        }
        return {
          data: response,
          error: null,
        };
      } catch (err) {
        // Handle AbortError specifically - aborts are intentional user actions,
        // not errors, so we don't trigger onError callback
        if (isAbortError(err)) {
          setIsLoading(false);
          return {
            data: null,
            error: "Request aborted",
          };
        }

        const errorResult = handleError<{
          data: null;
          error: string;
        }>(err, onError);
        setIsLoading(false);
        return errorResult;
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [getToken, baseUrl, globalOnData, globalOnThinking, onFinish, onError]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
