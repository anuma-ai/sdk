/**
 * Progressive conversation history summarization.
 *
 * Summarizes older messages into a compact text while keeping recent messages
 * verbatim. Uses a cheap model (e.g., Gemini Flash) to minimize cost.
 *
 * Based on LangChain's ConversationSummaryBufferMemory pattern:
 * https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain_classic/memory/prompt.py
 */

import type { Database } from "@nozbe/watermelondb";

import type { LlmapiMessage } from "../../client";
import { BASE_URL } from "../../clientConfig";
import {
  createSummaryContext,
  deleteConversationSummaryOp,
  getConversationSummaryOp,
  upsertConversationSummaryOp,
} from "../db/chat/summaryOperations";
import type { StoredConversationSummary, StoredMessage } from "../db/chat/types";

/** Default token threshold before summarization triggers */
export const DEFAULT_SUMMARY_TOKEN_THRESHOLD = 4000;

/** Default minimum messages to keep verbatim */
export const DEFAULT_SUMMARY_MIN_WINDOW_MESSAGES = 4;

/** Default model for summarization */
export const DEFAULT_SUMMARY_MODEL = "google/gemini-2.0-flash";

/**
 * Summarization prompt adapted from LangChain's ConversationSummaryBufferMemory.
 *
 * Source: https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain_classic/memory/prompt.py
 *
 * Modifications from original:
 * - Added "user preferences" to preservation criteria (Memoryless has memory/personalization)
 * - Kept the one-shot example from LangChain for output formatting
 */
const SUMMARIZATION_PROMPT = `Progressively summarize the lines of conversation provided, adding onto the previous summary returning a new summary. Preserve key facts, decisions, user preferences, and any information the user might reference later. Be concise.

EXAMPLE
Current summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good.

New lines of conversation:
Human: Why do you think artificial intelligence is a force for good?
AI: Because artificial intelligence will help humans reach their full potential.

New summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential.
END OF EXAMPLE

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`;

/**
 * Estimate token count from text using chars/4 approximation.
 * This is fast and accurate enough for threshold checks — no tokenizer needed.
 *
 * Known limitation: CJK/Arabic/emoji-heavy text can be 2-3x off because a
 * single character may map to 1-3 tokens. For multilingual products, this means
 * summarization may trigger later than expected for non-Latin-script users.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Approximate overhead per message for role/framing tokens (e.g., <|im_start|>role\n...<|im_end|>) */
const PER_MESSAGE_OVERHEAD_TOKENS = 4;

/**
 * Maximum messages to summarize in a single LLM call.
 * Prevents oversized prompts that would exceed the summarization timeout,
 * especially after summary invalidation where the full history is re-summarized.
 * Over multiple sends, remaining messages are progressively absorbed.
 */
export const MAX_MESSAGES_PER_SUMMARIZATION = 20;

/**
 * Estimate total tokens for an array of stored messages.
 * Includes a per-message overhead for role/framing tokens that chat models add.
 */
export function estimateMessagesTokens(messages: StoredMessage[]): number {
  return messages.reduce(
    (sum, msg) => sum + estimateTokens(msg.content) + PER_MESSAGE_OVERHEAD_TOKENS,
    0
  );
}

/**
 * Format stored messages as "Human: ..\nAI: .." for the summarization prompt.
 * Skips system messages and empty-content messages (e.g., tool-call invocations
 * with no text). Tool-call JSON blobs are replaced with a readable placeholder
 * to avoid polluting the summarization prompt with raw JSON.
 */
function formatMessagesForPrompt(messages: StoredMessage[]): string {
  return messages
    .filter((msg) => msg.role !== "system")
    .filter((msg) => msg.content.trim().length > 0)
    .map((msg) => {
      const role = msg.role === "user" ? "Human" : "AI";
      // Detect tool-call JSON blobs (common in agentic conversations) and
      // replace with a readable placeholder to keep the summary coherent.
      const content = msg.content.trim();
      if (role === "AI" && content.startsWith("{") && content.includes("tool_calls")) {
        return `${role}: [used a tool]`;
      }
      return `${role}: ${content}`;
    })
    .join("\n");
}

/**
 * Build the full summarization prompt with template variables filled in.
 */
function buildSummarizationPrompt(
  existingSummary: string | undefined,
  newMessages: StoredMessage[]
): string {
  const summary = existingSummary || "No previous summary.";
  const newLines = formatMessagesForPrompt(newMessages);
  // Split on placeholders to avoid chained .replace() — prevents corruption if
  // the summary text contains the literal string "{new_lines}".
  const [before, afterSummary] = SUMMARIZATION_PROMPT.split("{summary}");
  const [middle, after] = afterSummary.split("{new_lines}");
  return before + summary + middle + newLines + after;
}

/**
 * Split messages into "to summarize" and "window" based on token threshold.
 *
 * Walks backwards from the most recent message, accumulating tokens until
 * the threshold is reached. Messages within the threshold form the window
 * (kept verbatim). Messages before the cutoff are to be summarized.
 *
 * Always keeps at least `minWindowMessages` in the window.
 */
export function splitMessagesAtThreshold(
  messages: StoredMessage[],
  tokenThreshold: number,
  minWindowMessages: number
): { toSummarize: StoredMessage[]; window: StoredMessage[] } {
  if (messages.length <= minWindowMessages) {
    return { toSummarize: [], window: messages };
  }

  let cumulativeTokens = 0;
  // Initialize to messages.length so that if the loop reaches i=0 without
  // finding a split point, the i=0 branch sets cutoffIndex=0 (everything in window).
  // This initial value is never used as-is — the loop always completes.
  let cutoffIndex = messages.length;

  // Walk backwards from the most recent message.
  // Note: the message that pushes over the threshold is placed in toSummarize (conservative).
  // This means the window is always strictly under the threshold, never at it.
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content) + PER_MESSAGE_OVERHEAD_TOKENS;
    if (
      cumulativeTokens + msgTokens > tokenThreshold &&
      messages.length - i - 1 >= minWindowMessages
    ) {
      cutoffIndex = i + 1;
      break;
    }
    cumulativeTokens += msgTokens;
    // If we've reached the beginning, everything fits in the window
    if (i === 0) {
      cutoffIndex = 0;
    }
  }

  return {
    toSummarize: messages.slice(0, cutoffIndex),
    window: messages.slice(cutoffIndex),
  };
}

/** Options for the progressive summarization call */
interface SummarizeOptions {
  /** Existing cached summary (null on first summarization) */
  cachedSummary: StoredConversationSummary | null;
  /** Messages that haven't been summarized yet */
  unsummarizedMessages: StoredMessage[];
  /** Token threshold for history */
  tokenThreshold: number;
  /** Minimum messages to keep in the verbatim window */
  minWindowMessages: number;
  /** Function to call the LLM for summarization */
  callLlm: (prompt: string, model: string) => Promise<string>;
  /** Model to use for summarization */
  model: string;
}

/** Result of progressive summarization */
interface SummarizeResult {
  /** The new/updated summary text (null if no summarization needed) */
  summary: string | null;
  /** uniqueId of the last message included in the summary */
  summarizedUpTo: string | null;
  /** Approximate token count of the summary */
  summaryTokenCount: number;
  /** Messages to send verbatim (the window) */
  windowMessages: StoredMessage[];
  /** Whether summarization was performed */
  didSummarize: boolean;
}

/**
 * Progressive conversation summarization.
 *
 * Checks if history exceeds the token threshold. If so, splits messages into
 * "to summarize" and "window", then calls the LLM to extend the existing
 * summary with the newly pruned messages.
 *
 * Falls back gracefully: if summarization fails, returns all messages verbatim.
 */
export async function progressiveSummarize(options: SummarizeOptions): Promise<SummarizeResult> {
  const { cachedSummary, unsummarizedMessages, tokenThreshold, minWindowMessages, callLlm, model } =
    options;

  const cachedTokens = cachedSummary?.tokenCount ?? 0;
  const messagesTokens = estimateMessagesTokens(unsummarizedMessages);
  const totalTokens = cachedTokens + messagesTokens;

  // Under threshold — no summarization needed
  if (totalTokens <= tokenThreshold) {
    return {
      summary: cachedSummary?.summary ?? null,
      summarizedUpTo: cachedSummary?.summarizedUpTo ?? null,
      summaryTokenCount: cachedTokens,
      windowMessages: unsummarizedMessages,
      didSummarize: false,
    };
  }

  // Over threshold — split and summarize.
  // Subtract cached summary tokens so window + summary stays within the total budget.
  const windowBudget = Math.max(0, tokenThreshold - cachedTokens);
  let { toSummarize, window } = splitMessagesAtThreshold(
    unsummarizedMessages,
    windowBudget,
    minWindowMessages
  );

  // Cap messages per summarization call to prevent oversized prompts that would
  // exceed the timeout (especially after summary invalidation). Excess messages
  // are moved back to the window and will be summarized in subsequent sends.
  if (toSummarize.length > MAX_MESSAGES_PER_SUMMARIZATION) {
    const excess = toSummarize.slice(MAX_MESSAGES_PER_SUMMARIZATION);
    toSummarize = toSummarize.slice(0, MAX_MESSAGES_PER_SUMMARIZATION);
    window = [...excess, ...window];
  }

  // Nothing to summarize (all messages fit in the window due to min window constraint)
  if (toSummarize.length === 0) {
    return {
      summary: cachedSummary?.summary ?? null,
      summarizedUpTo: cachedSummary?.summarizedUpTo ?? null,
      summaryTokenCount: cachedTokens,
      windowMessages: window,
      didSummarize: false,
    };
  }

  try {
    const prompt = buildSummarizationPrompt(cachedSummary?.summary, toSummarize);
    const newSummary = await callLlm(prompt, model);
    if (!newSummary || newSummary.trim().length === 0) {
      throw new Error("Summarization returned empty response");
    }

    const lastSummarized = toSummarize[toSummarize.length - 1];

    return {
      summary: newSummary,
      summarizedUpTo: lastSummarized.uniqueId,
      summaryTokenCount: estimateTokens(newSummary),
      windowMessages: window,
      didSummarize: true,
    };
  } catch {
    // Summarization failed — fall back to sending all messages verbatim
    return {
      summary: cachedSummary?.summary ?? null,
      summarizedUpTo: cachedSummary?.summarizedUpTo ?? null,
      summaryTokenCount: cachedTokens,
      windowMessages: unsummarizedMessages,
      didSummarize: false,
    };
  }
}

/**
 * Create a system message containing the conversation summary.
 * This is injected before the verbatim window messages.
 */
export function summaryToSystemMessage(summary: string): LlmapiMessage {
  return {
    role: "system",
    content: [
      {
        type: "text",
        text: `Conversation summary (older messages have been summarized to save context):\n\n${summary}`,
      },
    ],
  };
}

/** Timeout for the summarization LLM call (ms). If exceeded, falls back to verbatim. */
const SUMMARIZATION_TIMEOUT_MS = 10_000;

/**
 * Lightweight, non-streaming LLM call for summarization.
 *
 * Uses a direct fetch to the chat completions endpoint instead of `baseSendMessage`
 * to avoid side effects (isLoading state, abortController, conversationId tracking).
 * No conversationId is sent — summarization calls are invisible to server-side billing/tracking.
 *
 * Includes a timeout to prevent slow/hanging summarization from blocking the user's message.
 */
export async function callSummarizationLlm(
  prompt: string,
  model: string,
  token: string,
  baseUrl?: string
): Promise<string> {
  const url = `${baseUrl || BASE_URL}/api/v1/chat/completions`;

  // Single timeout mechanism: AbortController aborts the fetch, Promise.race
  // ensures response.json() is also covered. One timer, one responsibility.
  const controller = new AbortController();

  const doRequest = async (): Promise<string> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Summarization LLM call failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    };

    // Chat Completions API format
    if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      if (Array.isArray(content)) {
        return content.map((part) => part.text || "").join("");
      }
      return String(content);
    }

    throw new Error("Unexpected API response format for summarization");
  };

  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Summarization timeout"));
    }, SUMMARIZATION_TIMEOUT_MS);
  });

  // Swallow orphaned rejection from doRequest if the timeout wins the race.
  // The fetch is aborted above, so the AbortError rejection is expected.
  const doRequestPromise = doRequest();
  doRequestPromise.catch(() => {});

  try {
    return await Promise.race([doRequestPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * In-memory lock to prevent concurrent summarizations for the same conversation.
 * Uses a Map so that concurrent callers can await the in-progress result instead
 * of skipping entirely and paying full verbatim cost.
 */
export const summarizationLocks = new Map<string, Promise<MaybeSummarizeHistoryResult>>();

/**
 * Tracks when compaction was last performed per conversation (epoch ms).
 * Prevents compaction from re-triggering on every send when the compacted
 * summary is still above the 80% threshold.
 */
const lastCompactionTime = new Map<string, number>();

/** Minimum interval between compaction attempts (ms) */
const COMPACTION_COOLDOWN_MS = 60_000;

/**
 * Maximum ratio of the token threshold that the cached summary may occupy.
 * When exceeded, the summary is invalidated and rebuilt from scratch to prevent
 * unbounded growth (H2 fix).
 */
const MAX_SUMMARY_TOKEN_RATIO = 0.8;

/** Options for `maybeSummarizeHistory` */
interface MaybeSummarizeHistoryOptions {
  database: Database;
  conversationId: string;
  messages: StoredMessage[];
  summarizeHistory: boolean;
  summaryTokenThreshold: number;
  summaryMinWindowMessages: number;
  summaryModel: string;
  /** Auth token for the summarization LLM call */
  token: string;
  /** Base URL for the API */
  baseUrl?: string;
}

/** Result of `maybeSummarizeHistory` */
interface MaybeSummarizeHistoryResult {
  /** Messages to convert and send (window messages if summarized, all if not) */
  messagesToConvert: StoredMessage[];
  /** Summary system message to prepend, or null if no summary */
  summarySystemMessage: LlmapiMessage | null;
}

/**
 * Shared summarization logic for both React and Expo useChatStorage hooks.
 *
 * Checks if history needs summarization, calls the LLM if so, persists the result,
 * and returns the window messages + optional summary system message.
 *
 * Falls back to sending all messages verbatim on any error.
 */
export async function maybeSummarizeHistory(
  options: MaybeSummarizeHistoryOptions
): Promise<MaybeSummarizeHistoryResult> {
  const {
    database,
    conversationId,
    messages,
    summarizeHistory,
    summaryTokenThreshold,
    summaryMinWindowMessages,
    summaryModel,
    token,
    baseUrl,
  } = options;

  if (!summarizeHistory || messages.length <= summaryMinWindowMessages) {
    return { messagesToConvert: messages, summarySystemMessage: null };
  }

  // Skip summarization if no auth token — would silently fail with 401
  if (!token) {
    console.warn("[summarize] No auth token available, skipping summarization");
    return { messagesToConvert: messages, summarySystemMessage: null };
  }

  // H3 fix: If another summarization is in progress for this conversation,
  // await its result instead of skipping (avoids paying full verbatim cost).
  // Known limitation: the second caller gets the first caller's window, which may
  // miss the most recent message. This is acceptable — the missing message is one
  // turn of context, and the alternative (no lock) risks duplicate LLM calls.
  const inProgress = summarizationLocks.get(conversationId);
  if (inProgress) {
    // Safety timeout: if the in-progress promise is stuck (e.g., fetch hangs past
    // AbortController, WatermelonDB write deadlocks), auto-expire after 15s and
    // fall back to verbatim rather than blocking indefinitely.
    const verbatimFallback: MaybeSummarizeHistoryResult = {
      messagesToConvert: messages,
      summarySystemMessage: null,
    };
    let staleGuardTimerId: ReturnType<typeof setTimeout>;
    const staleGuard = new Promise<MaybeSummarizeHistoryResult>((resolve) => {
      staleGuardTimerId = setTimeout(() => resolve(verbatimFallback), 15_000);
    });
    // Swallow rejections on inProgress — if the stale guard wins the race and
    // inProgress later rejects, the rejection would otherwise be unobserved.
    try {
      return await Promise.race([inProgress.catch(() => verbatimFallback), staleGuard]);
    } finally {
      clearTimeout(staleGuardTimerId!);
    }
  }

  const promise = doSummarizeHistory(options);
  summarizationLocks.set(conversationId, promise);

  try {
    return await promise;
  } finally {
    summarizationLocks.delete(conversationId);
  }
}

/** Prompt template for compacting an oversized summary */
const COMPACTION_PROMPT = `The following conversation summary has grown too long. Condense it to be more concise while preserving all key facts, decisions, user preferences, and important context. Target roughly half the current length.

Summary to condense:
{summary}

Condensed summary:`;

/**
 * Internal implementation of `maybeSummarizeHistory`.
 * Separated so the public function can handle concurrency locking.
 */
async function doSummarizeHistory(
  options: MaybeSummarizeHistoryOptions
): Promise<MaybeSummarizeHistoryResult> {
  const {
    database,
    conversationId,
    messages,
    summaryTokenThreshold,
    summaryMinWindowMessages,
    summaryModel,
    token,
    baseUrl,
  } = options;

  try {
    const summaryCtx = createSummaryContext(database);
    let cachedSummary = await getConversationSummaryOp(summaryCtx, conversationId);

    // H1 fix: If the cached summary has grown too large (>80% of the threshold),
    // compact it with an LLM call instead of invalidating. This avoids the token
    // spike that would occur from re-summarizing the full history from scratch.
    // Cooldown prevents re-triggering every send when compacted summary is still large.
    const lastCompacted = lastCompactionTime.get(conversationId) ?? 0;
    const compactionCooledDown = Date.now() - lastCompacted > COMPACTION_COOLDOWN_MS;
    if (
      cachedSummary &&
      cachedSummary.tokenCount > summaryTokenThreshold * MAX_SUMMARY_TOKEN_RATIO &&
      compactionCooledDown
    ) {
      try {
        // Use split+concat (not .replace()) to avoid JS replacement pattern injection
        // if the summary contains $&, $', or $` characters.
        const [before, after] = COMPACTION_PROMPT.split("{summary}");
        const compactPrompt = before + cachedSummary.summary + after;
        const compactedSummary = await callSummarizationLlm(
          compactPrompt,
          summaryModel,
          token,
          baseUrl
        );
        const compactedTokens = estimateTokens(compactedSummary);
        await upsertConversationSummaryOp(
          summaryCtx,
          conversationId,
          compactedSummary,
          cachedSummary.summarizedUpTo,
          compactedTokens
        );
        cachedSummary = {
          ...cachedSummary,
          summary: compactedSummary,
          tokenCount: compactedTokens,
        };
        lastCompactionTime.set(conversationId, Date.now());
      } catch {
        // Compaction failed — proceed with the oversized summary. It still works,
        // just less efficient. Will retry after cooldown.
        lastCompactionTime.set(conversationId, Date.now());
        console.warn("[summarize] Summary compaction failed, proceeding with oversized summary");
      }
    }

    // Get messages after the summary cutoff point
    let unsummarized: StoredMessage[];
    if (cachedSummary?.summarizedUpTo) {
      const cutoffIndex = messages.findIndex(
        (msg) => msg.uniqueId === cachedSummary.summarizedUpTo
      );
      if (cutoffIndex >= 0) {
        unsummarized = messages.slice(cutoffIndex + 1);
      } else {
        // summarizedUpTo is not in the current messages array. This typically means
        // the message is older than the truncated window (maxHistoryMessages), NOT
        // that it was deleted. The cached summary already captures that earlier
        // history, so we keep it and treat all current messages as unsummarized.
        unsummarized = messages;
      }
    } else {
      unsummarized = messages;
    }

    // Filter out system messages before summarization — they are re-injected fresh
    // each request and shouldn't count toward the token threshold or be summarized.
    const nonSystemMessages = unsummarized.filter((msg) => msg.role !== "system");

    const callLlm = (prompt: string, llmModel: string) =>
      callSummarizationLlm(prompt, llmModel, token, baseUrl);

    const summarizeResult = await progressiveSummarize({
      cachedSummary,
      unsummarizedMessages: nonSystemMessages,
      tokenThreshold: summaryTokenThreshold,
      minWindowMessages: summaryMinWindowMessages,
      callLlm,
      model: summaryModel,
    });

    // Persist the updated summary if summarization was performed
    if (summarizeResult.didSummarize && summarizeResult.summary && summarizeResult.summarizedUpTo) {
      await upsertConversationSummaryOp(
        summaryCtx,
        conversationId,
        summarizeResult.summary,
        summarizeResult.summarizedUpTo,
        summarizeResult.summaryTokenCount
      );
    }

    // M2 fix: Re-inject system messages that fall within the window range.
    // progressiveSummarize only sees nonSystemMessages, so its windowMessages
    // won't contain system messages. We find the window boundary in the original
    // unsummarized array and include system messages from that point onwards.
    let messagesToConvert = summarizeResult.windowMessages;
    if (
      summarizeResult.windowMessages.length > 0 &&
      summarizeResult.windowMessages.length < unsummarized.length
    ) {
      const firstWindowId = summarizeResult.windowMessages[0].uniqueId;
      const windowStartInOriginal = unsummarized.findIndex((msg) => msg.uniqueId === firstWindowId);
      if (windowStartInOriginal >= 0) {
        messagesToConvert = unsummarized.slice(windowStartInOriginal);
      }
    }

    return {
      messagesToConvert,
      summarySystemMessage: summarizeResult.summary
        ? summaryToSystemMessage(summarizeResult.summary)
        : null,
    };
  } catch (err) {
    // Summarization failed — fall back to sending all messages verbatim.
    // Log the error so developers can diagnose issues (e.g., auth token expiry).
    console.warn("[summarize] Summarization failed, falling back to verbatim:", err);
    return { messagesToConvert: messages, summarySystemMessage: null };
  }
}

/**
 * Delete the conversation summary cache. Logs a warning on failure
 * rather than throwing, since this is a cascade cleanup operation.
 */
export async function cleanupConversationSummary(
  database: Database,
  conversationId: string
): Promise<void> {
  try {
    const summaryCtx = createSummaryContext(database);
    await deleteConversationSummaryOp(summaryCtx, conversationId);
    lastCompactionTime.delete(conversationId);
  } catch (err) {
    console.warn("[summarize] Failed to delete conversation summary cache:", err);
  }
}
