"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiMessage } from "../client";
import { BASE_URL } from "../clientConfig";
import {
  resumeStream as runResumeStream,
  type ResumeStreamOptions,
  type ResumeStreamResult,
  streamCancelPath,
} from "../lib/chat/resumeStream";
import {
  type ApiType,
  type AutoExecutedToolResult,
  type BaseSendMessageArgs,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  createErrorResult,
  resolveApiType,
  runToolLoop,
  type RunToolLoopResult,
  type StreamResumeHandle,
  validateToken,
  validateTokenGetter,
} from "../lib/chat/useChat";
import { xhrTransport } from "../lib/chat/xhrTransport";
import { getLogger } from "../lib/logger";
import { PiiRedactor } from "../lib/pii/redactor";

type SendMessageArgs = BaseSendMessageArgs & {
  onThinking?: (chunk: string) => void;
  memoryContext?: string;
  searchContext?: string;
  fileContext?: string;
  toolGuidance?: string;
  apiType?: ApiType;
  headers?: Record<string, string>;
};

type SendMessageResult =
  | {
      data: NonNullable<RunToolLoopResult["data"]>;
      error: null;
      toolsChecksum?: string;
      autoExecutedToolResults?: AutoExecutedToolResult[];
    }
  | {
      data: RunToolLoopResult["data"] | null;
      error: string;
      toolsChecksum?: string;
    }
  | {
      data: RunToolLoopResult["data"];
      error: "Request detached";
      detached: true;
      resume: StreamResumeHandle | null;
    };

interface UseChatOptions extends BaseUseChatOptions {
  apiType?: ApiType;
  resumable?: boolean;
  onCancelResult?: (result: {
    inferenceId: string;
    ok: boolean;
    status?: number;
    error?: Error;
  }) => void;
  onStreamMeta?: (meta: {
    inferenceId: string;
    apiType: "responses" | "completions";
    model?: string;
    round?: number;
  }) => void;
}

type UseChatResult = BaseUseChatResult & {
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
  detach: () => StreamResumeHandle | null;
  resumeStream: (
    handle: StreamResumeHandle,
    opts?: Pick<ResumeStreamOptions, "idleTimeoutMs" | "smoothing"> & {
      headless?: boolean;
    }
  ) => Promise<ResumeStreamResult>;
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
 *     model: 'fireworks/accounts/fireworks/models/kimi-k2p5'
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
    onToolCallArgumentsDelta,
    onStepFinish,
    apiType: defaultApiType = "auto",
    smoothing,
    preProcessors,
    piiRedaction,
    onPiiRedacted,
    resumable = false,
    onCancelResult,
    onStreamMeta: onStreamMetaConsumer,
  } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const detachControllerRef = useRef<AbortController | null>(null);
  const pendingResumeRef = useRef<StreamResumeHandle | null>(null);
  const requestIdRef = useRef(0);

  const fireCancel = useCallback(
    (handle: StreamResumeHandle) => {
      const { inferenceId } = handle;
      void (async () => {
        const token = getToken ? await getToken() : null;
        const res = await fetch(`${baseUrl}${streamCancelPath(inferenceId)}`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return { inferenceId, ok: res.ok, status: res.status };
      })().then(
        (result) => onCancelResult?.(result),
        (err) => {
          getLogger().warn("[useChat] stream cancel POST failed:", err);
          onCancelResult?.({ inferenceId, ok: false, error: err as Error });
        }
      );
    },
    [getToken, baseUrl, onCancelResult]
  );

  const piiRedactorRef = useRef<PiiRedactor | null>(null);
  if (piiRedaction === true && !piiRedactorRef.current) {
    piiRedactorRef.current = new PiiRedactor();
  }
  const resolvedPiiRedaction = piiRedaction === true ? piiRedactorRef.current! : piiRedaction;

  const stop = useCallback(() => {
    const pending = pendingResumeRef.current;
    if (resumable && pending) fireCancel(pending);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    detachControllerRef.current = null;
    pendingResumeRef.current = null;
  }, [resumable, fireCancel]);

  const detach = useCallback((): StreamResumeHandle | null => {
    if (detachControllerRef.current) {
      detachControllerRef.current.abort();
    }
    return pendingResumeRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      detachControllerRef.current = null;
      pendingResumeRef.current = null;
    };
  }, []);

  const resumeStream = useCallback(
    async (
      handle: StreamResumeHandle,
      opts?: Pick<ResumeStreamOptions, "idleTimeoutMs" | "smoothing"> & { headless?: boolean }
    ): Promise<ResumeStreamResult> => {
      const getterValidation = validateTokenGetter(getToken);
      if (!getterValidation.valid) {
        return { data: null, error: getterValidation.message, interrupted: false };
      }
      const token = await getToken!();
      const tokenValidation = validateToken(token);
      if (!tokenValidation.valid) {
        return { data: null, error: tokenValidation.message, interrupted: false };
      }

      const { headless, ...resumeOpts } = opts ?? {};
      const abortController = new AbortController();
      if (!headless) abortControllerRef.current = abortController;
      if (!headless) setIsLoading(true);
      try {
        return await runResumeStream({
          handle,
          token: token!,
          baseUrl,
          transport: xhrTransport,
          smoothing,
          signal: abortController.signal,
          ...(headless
            ? {}
            : {
                onData: (chunk) => {
                  if (globalOnData) globalOnData(chunk);
                },
                onThinking: (chunk) => {
                  if (globalOnThinking) globalOnThinking(chunk);
                },
                onFinish,
                onError,
              }),
          ...resumeOpts,
        });
      } finally {
        if (!headless) setIsLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [getToken, baseUrl, smoothing, globalOnData, globalOnThinking, onFinish, onError]
  );

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onData,
      onThinking,
      memoryContext,
      searchContext,
      fileContext,
      toolGuidance,
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
      headers,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const detachController = new AbortController();
      detachControllerRef.current = detachController;
      const requestId = ++requestIdRef.current;
      const superseded = () => requestIdRef.current !== requestId;
      pendingResumeRef.current = null;

      setIsLoading(true);

      try {
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

        const result: RunToolLoopResult = await runToolLoop({
          messages: messagesWithContext,
          model: model!,
          token: token!,
          baseUrl,
          apiType: requestApiType ?? defaultApiType,
          endpointOverride,
          temperature,
          maxOutputTokens,
          tools,
          toolChoice,
          maxToolRounds,
          reasoning,
          thinking,
          imageModel,
          conversationId,
          headers,
          smoothing,
          signal: abortController.signal,
          resumable,
          detachSignal: detachController.signal,
          transport: xhrTransport,
          onStreamMeta: (meta) => {
            const resolvedApiType = resolveApiType(requestApiType ?? defaultApiType, model);
            pendingResumeRef.current = {
              inferenceId: meta.inferenceId,
              apiType: resolvedApiType,
              model,
              conversationId,
            };
            if (onStreamMetaConsumer) {
              try {
                onStreamMetaConsumer({
                  inferenceId: meta.inferenceId,
                  apiType: resolvedApiType,
                  model,
                  round: meta.round,
                });
              } catch (metaErr) {
                getLogger().warn("[useChat] consumer onStreamMeta threw:", metaErr);
              }
            }
          },
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

        if (superseded()) {
          // A newer request owns the resume handle; leave it alone.
        } else if ("detached" in result && result.detached && result.resume) {
          pendingResumeRef.current = result.resume;
        } else {
          pendingResumeRef.current = null;
        }

        return result;
      } catch (err) {
        return createErrorResult(
          err instanceof Error ? err.message : "Failed to send message.",
          onError
        );
      } finally {
        if (!superseded()) setIsLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        if (detachControllerRef.current === detachController) {
          detachControllerRef.current = null;
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
      onToolCallArgumentsDelta,
      onStepFinish,
      defaultApiType,
      smoothing,
      preProcessors,
      resolvedPiiRedaction,
      onPiiRedacted,
      resumable,
      onStreamMetaConsumer,
    ]
  );

  return {
    isLoading,
    sendMessage,
    stop,
    detach,
    resumeStream,
  };
}
