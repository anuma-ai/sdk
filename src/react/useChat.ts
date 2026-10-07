"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiMessage } from "../client";
import { BASE_URL } from "../clientConfig";
import { streamCancelPath } from "../lib/chat/resumeStream";
import {
  type ApiResponse,
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
import { getLogger } from "../lib/logger";
import { PiiRedactor } from "../lib/pii/redactor";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Optional custom headers to include with the request.
   */
  headers?: Record<string, string>;
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
   * Tool-set guidance to inject as a system message — e.g. the App Builder
   * prompt that rides with the app-generation tool set. Added as a separate
   * system message (additive), so it composes with the persona / base prompt
   * rather than replacing it. Typically computed by `useChatStorage` from the
   * tool sets activated for the request via `toolSetSystemPrompts`.
   */
  toolGuidance?: string;
  /**
   * Per-request callback for thinking/reasoning chunks. Called in addition to the global
   * `onThinking` callback if provided in `useChat` options.
   *
   * @param chunk - The thinking delta from the current chunk
   */
  onThinking?: (chunk: string) => void;
  /**
   * Override the API type for this request only.
   * Useful when different models need different APIs.
   * @default Uses the hook-level apiType or "auto"
   */
  apiType?: ApiType;
};

type SendMessageResult =
  | {
      data: ApiResponse;
      error: null;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
      /** Results from tools that were auto-executed by the SDK */
      autoExecutedToolResults?: AutoExecutedToolResult[];
    }
  | {
      data: ApiResponse | null;
      error: string;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
    };

/**
 * @inline
 */
interface UseChatOptions extends BaseUseChatOptions {
  /** Buffer streamed rounds so a service can verify their canonical output. */
  resumable?: boolean;
  /** Inference identifier for each HTTP round, including client-tool continuations. */
  onStreamMeta?: (meta: { inferenceId: string; round: number }) => void;
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
 *     model: 'your-provider/your-model'
 *   });
 * };
 *
 * // Using extended thinking
 * const result = await sendMessage({
 *   messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve this complex problem...' }] }],
 *   model: 'your-provider/your-model',
 *   thinking: { type: 'enabled', budget_tokens: 10000 },
 *   onThinking: (chunk) => console.log('Thinking:', chunk)
 * });
 *
 * // Using reasoning
 * const result = await sendMessage({
 *   messages: [{ role: 'user', content: [{ type: 'text', text: 'Reason through this...' }] }],
 *   model: 'your-provider/your-model',
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
    onToolCall,
    onServerToolCall,
    onToolCallArgumentsDelta,
    onStepFinish,
    resumable,
    onStreamMeta,
    apiType: defaultApiType = "auto",
    smoothing,
    preProcessors,
    piiRedaction,
    onPiiRedacted,
  } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Monotonic id of the latest send. Unlike abortControllerRef it is never
  // reset by stop() or a settling request, so "a newer send exists" cannot be
  // confused with "the ref is null".
  const requestIdRef = useRef(0);
  const pendingInferenceRef = useRef<string | null>(null);
  const cancelInference = useCallback(
    (inferenceId: string) => {
      void (async () => {
        const token = getToken ? await getToken() : null;
        const response = await fetch(`${baseUrl}${streamCancelPath(inferenceId)}`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) throw new Error(`Stream cancellation failed: ${response.status}`);
      })().catch((error) => getLogger().warn("[useChat] stream cancel POST failed:", error));
    },
    [getToken, baseUrl]
  );

  // When piiRedaction is `true`, upgrade it to a single redactor instance kept
  // for the lifetime of this hook so placeholder state is shared across turns
  // (matching the documented behavior of passing an instance). An explicit
  // instance or `false` is passed through unchanged.
  const piiRedactorRef = useRef<PiiRedactor | null>(null);
  if (piiRedaction === true && !piiRedactorRef.current) {
    piiRedactorRef.current = new PiiRedactor();
  }
  const resolvedPiiRedaction = piiRedaction === true ? piiRedactorRef.current! : piiRedaction;

  const stop = useCallback(() => {
    const inferenceId = pendingInferenceRef.current;
    pendingInferenceRef.current = null;
    if (resumable && inferenceId) cancelInference(inferenceId);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [resumable, cancelInference]);

  // Cleanup reads the latest callback without cancelling when options rerender.
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onData,
      onThinking,
      headers,
      memoryContext,
      searchContext,
      fileContext,
      toolGuidance,
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
      endpointOverride,
      piiRedaction: requestPiiRedaction,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      // Replacing a resumable generation must stop its server-side spend too.
      stop();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const requestId = ++requestIdRef.current;

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

        if (toolGuidance) {
          const toolGuidanceMessage: LlmapiMessage = {
            role: "system",
            content: [{ type: "text", text: toolGuidance }],
          };
          messagesWithContext = [toolGuidanceMessage, ...messagesWithContext];
        }

        // Delegate to the framework-agnostic tool loop
        const result: RunToolLoopResult = await runToolLoop({
          messages: messagesWithContext,
          model: model!,
          token: token!,
          baseUrl,
          headers,
          apiType: requestApiType ?? defaultApiType,
          endpointOverride,
          resumable,
          onStreamMeta:
            resumable || onStreamMeta
              ? (meta) => {
                  if (requestId !== requestIdRef.current || abortController.signal.aborted) {
                    if (resumable) cancelInference(meta.inferenceId);
                    return;
                  }
                  pendingInferenceRef.current = meta.inferenceId;
                  onStreamMeta?.(meta);
                }
              : undefined,
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
          onToolCallArgumentsDelta,
          onStepFinish,
          preProcessors,
          piiRedaction: requestPiiRedaction ?? resolvedPiiRedaction,
          onPiiRedacted,
        });

        return result;
      } catch (err) {
        return createErrorResult(
          err instanceof Error ? err.message : "Failed to send message.",
          onError
        );
      } finally {
        // A newer request owns the ref and the loading flag once it replaces
        // this one; the aborted call settles later and must not clear them.
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
          abortControllerRef.current = null;
          pendingInferenceRef.current = null;
        }
      }
    },
    [
      getToken,
      baseUrl,
      stop,
      cancelInference,
      globalOnData,
      globalOnThinking,
      onFinish,
      onError,
      onToolCall,
      onServerToolCall,
      onToolCallArgumentsDelta,
      onStepFinish,
      resumable,
      onStreamMeta,
      defaultApiType,
      smoothing,
      preProcessors,
      resolvedPiiRedaction,
      onPiiRedacted,
    ]
  );

  return {
    isLoading,
    sendMessage,
    stop,
  };
}
