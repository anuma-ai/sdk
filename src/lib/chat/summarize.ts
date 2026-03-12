/**
 * Progressive conversation history summarization.
 *
 * Summarizes older messages into a compact text while keeping recent messages
 * verbatim. Uses a cheap model (e.g., Gemini Flash) to minimize cost.
 *
 * Based on LangChain's ConversationSummaryBufferMemory pattern:
 * https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain_classic/memory/prompt.py
 */

import type { LlmapiMessage } from "../../client";
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
 */
function formatMessagesForPrompt(messages: StoredMessage[]): string {
  return messages
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

  // Walk backwards from the most recent message
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
