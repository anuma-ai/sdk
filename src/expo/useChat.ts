"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiMessage } from "../client";
import { BASE_URL } from "../clientConfig";
import {
  type ApiType,
  type AutoExecutedToolResult,
  type BaseSendMessageArgs,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  createErrorResult,
  runToolLoop,
  type RunToolLoopResult,
  validateToken,
  validateTokenGetter,
} from "../lib/chat/useChat";
import { xhrTransport } from "../lib/chat/xhrTransport";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Per-request callback for thinking/reasoning chunks.
   */
  onThinking?: (chunk: string) => void;
  /**
   * Memory context to inject as a system message.
   * This is typically context from the memory engine or other sources.
   */
  memoryContext?: string;
  /**
   * Search context to inject as a system message.
   * This is typically formatted search results from useSearch.
   */
  searchContext?: string;
  /**
   * File context to inject as a system message.
   * This is typically extracted text from preprocessed file attachments.
   */
  fileContext?: string;
  /**
   * Override the API type for this request only.
   * Useful when different models need different APIs.
   * @default Uses the hook-level apiType or "auto"
   */
  apiType?: ApiType;
};

type SendMessageResult =
  | {
      data: NonNullable<RunToolLoopResult["data"]>;
      error: null;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
      /** Results from tools that were auto-executed by the SDK */
      autoExecutedToolResults?: AutoExecutedToolResult[];
    }
  | {
      data: RunToolLoopResult["data"] | null;
      error: string;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
    };

/**
 * @inline
 */
interface UseChatOptions extends BaseUseChatOptions {
  /**
   * Which API endpoint to use. Default: "auto"
   * - "auto": automatically selects the best API based on model support
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   */
  apiType?: ApiType;
}

type UseChatResult = BaseUseChatResult & {
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
};

/**
 * A React hook for managing chat completions with authentication.
 *
 * **React Native version** — Uses XMLHttpRequest for streaming since
 * `fetch` response body streaming isn't available in React Native.
 * Delegates all tool loop logic to the shared `runToolLoop`.
 *
 * @param options - Optional configuration object
 * @param options.getToken - An async function that returns an authentication token.
 * @param options.baseUrl - Optional base URL for the API requests.
 * @param options.onData - Callback function to be called when a new data chunk is received.
 * @param options.onThinking - Callback function to be called when thinking/reasoning content is received.
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an unexpected error is encountered.
 *
 * @returns An object containing:
 *   - `isLoading`: A boolean indicating whether a request is currently in progress
 *   - `sendMessage`: An async function to send chat messages
 *   - `stop`: A function to abort the current request
 *
 * @category Hooks
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
    onThinking: globalOnThinking,
    onFinish,
    onError,
    onToolCall,
    onServerToolCall,
    onStepFinish,
    apiType: defaultApiType = "auto",
    smoothing,
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
      onThinking,
      memoryContext,
      searchContext,
      fileContext,
      // Responses API options
      temperature,
      maxOutputTokens,
      tools,
      toolChoice,
      maxToolRounds,
      reasoning,
      thinking,
      imageModel,
      apiType: requestApiType,
      conversationId,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      try {
        // Validate token getter and get token
        const tokenGetterValidation = validateTokenGetter(getToken);
        if (!tokenGetterValidation.valid) {
          if (onError) onError(new Error(tokenGetterValidation.message));
          return { data: null, error: tokenGetterValidation.message };
        }

        const token = await getToken!();

        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          if (onError) onError(new Error(tokenValidation.message));
          return { data: null, error: tokenValidation.message };
        }

        // Inject context as system messages
        let messagesWithContext = messages;
        if (memoryContext) {
          const memorySystemMessage: LlmapiMessage = {
            role: "system",
            content: [{ type: "text", text: memoryContext }],
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
              { type: "text", text: searchContext },
            ],
          };
          messagesWithContext = [searchSystemMessage, ...messagesWithContext];
        }

        if (fileContext) {
          const fileSystemMessage: LlmapiMessage = {
            role: "system",
            content: [
              {
                type: "text",
                text:
                  'IMPORTANT: The user has attached files to this conversation. The extracted file contents are shown below. When the user asks about "the file", "this file", or "what\'s in the file", refer to this content:\n\n' +
                  fileContext,
              },
            ],
          };
          messagesWithContext = [fileSystemMessage, ...messagesWithContext];
        }

        // Delegate to the framework-agnostic tool loop with XHR transport
        const result: RunToolLoopResult = await runToolLoop({
          messages: messagesWithContext,
          model: model!,
          token: token!,
          baseUrl,
          apiType: requestApiType ?? defaultApiType,
          temperature,
          maxOutputTokens,
          tools,
          toolChoice,
          maxToolRounds,
          reasoning,
          thinking,
          imageModel,
          conversationId,
          smoothing,
          signal: abortController.signal,
          transport: xhrTransport,
          onData: (chunk) => {
            if (onData) onData(chunk);
            if (globalOnData) globalOnData(chunk);
          },
          onThinking: (chunk) => {
            if (onThinking) onThinking(chunk);
            if (globalOnThinking) globalOnThinking(chunk);
          },
          onFinish,
          onError,
          onToolCall,
          onServerToolCall,
          onStepFinish,
        });

        return result;
      } catch (err) {
        return createErrorResult(
          err instanceof Error ? err.message : "Failed to send message.",
          onError
        );
      } finally {
        setIsLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      getToken,
      baseUrl,
      globalOnData,
      globalOnThinking,
      onFinish,
      onError,
      onToolCall,
      onServerToolCall,
      onStepFinish,
      defaultApiType,
      smoothing,
    ]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
