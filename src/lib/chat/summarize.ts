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
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens for an array of stored messages.
 */
export function estimateMessagesTokens(messages: StoredMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
}

/**
 * Format stored messages as "Human: ..\nAI: .." for the summarization prompt.
 * Skips system messages (they are re-injected fresh each request and shouldn't be summarized).
 */
function formatMessagesForPrompt(messages: StoredMessage[]): string {
  return messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => {
      const role = msg.role === "user" ? "Human" : "AI";
      return `${role}: ${msg.content}`;
    })
    .join("\n");
}

/**
 * Build the full summarization prompt with template variables filled in.
 */
function buildSummarizationPrompt(existingSummary: string | undefined, newMessages: StoredMessage[]): string {
  const summary = existingSummary || "No previous summary.";
  const newLines = formatMessagesForPrompt(newMessages);
  return SUMMARIZATION_PROMPT.replace("{summary}", summary).replace("{new_lines}", newLines);
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
  let cutoffIndex = messages.length; // Start assuming everything is in the window

  // Walk backwards from the most recent message.
  // Note: the message that pushes over the threshold is placed in toSummarize (conservative).
  // This means the window is always strictly under the threshold, never at it.
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (cumulativeTokens + msgTokens > tokenThreshold && messages.length - i >= minWindowMessages) {
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
export interface SummarizeOptions {
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
export interface SummarizeResult {
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
  const { cachedSummary, unsummarizedMessages, tokenThreshold, minWindowMessages, callLlm, model } = options;

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

  // Over threshold — split and summarize
  const { toSummarize, window } = splitMessagesAtThreshold(unsummarizedMessages, tokenThreshold, minWindowMessages);

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

/**
 * Lightweight, non-streaming LLM call for summarization.
 *
 * Uses a direct fetch to the chat completions endpoint instead of `baseSendMessage`
 * to avoid side effects (isLoading state, abortController, conversationId tracking).
 * No conversationId is sent — summarization calls are invisible to server-side billing/tracking.
 */
export async function callSummarizationLlm(
  prompt: string,
  model: string,
  token: string,
  baseUrl?: string
): Promise<string> {
  const url = `${baseUrl || BASE_URL}/api/v1/chat/completions`;
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
}

/** Options for `maybeSummarizeHistory` */
export interface MaybeSummarizeHistoryOptions {
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
export interface MaybeSummarizeHistoryResult {
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

  try {
    const summaryCtx = createSummaryContext(database);
    const cachedSummary = await getConversationSummaryOp(summaryCtx, conversationId);

    // Get messages after the summary cutoff point
    let unsummarized: StoredMessage[];
    if (cachedSummary?.summarizedUpTo) {
      const cutoffIndex = messages.findIndex((msg) => msg.uniqueId === cachedSummary.summarizedUpTo);
      unsummarized = cutoffIndex >= 0 ? messages.slice(cutoffIndex + 1) : messages;
    } else {
      unsummarized = messages;
    }

    const callLlm = (prompt: string, llmModel: string) =>
      callSummarizationLlm(prompt, llmModel, token, baseUrl);

    const summarizeResult = await progressiveSummarize({
      cachedSummary,
      unsummarizedMessages: unsummarized,
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

    return {
      messagesToConvert: summarizeResult.windowMessages,
      summarySystemMessage: summarizeResult.summary ? summaryToSystemMessage(summarizeResult.summary) : null,
    };
  } catch {
    // Summarization failed — fall back to sending all messages verbatim
    return { messagesToConvert: messages, summarySystemMessage: null };
  }
}

/**
 * Delete the conversation summary cache. Logs a warning on failure
 * rather than throwing, since this is a cascade cleanup operation.
 */
export async function cleanupConversationSummary(database: Database, conversationId: string): Promise<void> {
  try {
    const summaryCtx = createSummaryContext(database);
    await deleteConversationSummaryOp(summaryCtx, conversationId);
  } catch (err) {
    console.warn("[summarize] Failed to delete conversation summary cache:", err);
  }
}
