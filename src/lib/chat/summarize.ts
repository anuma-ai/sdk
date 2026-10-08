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
import { INTERNAL_FLOW_MARKER } from "../internalFlowMarker.js";
import { getLogger } from "../logger";
import type { PiiMatch, PiiRedactor } from "../pii/redactor";
import { taskTypeHeader } from "../taskType.js";

/** Default token threshold before summarization triggers */
export const DEFAULT_SUMMARY_TOKEN_THRESHOLD = 4000;

/** Default minimum messages to keep verbatim */
export const DEFAULT_SUMMARY_MIN_WINDOW_MESSAGES = 4;

/** Default model for summarization */
export const DEFAULT_SUMMARY_MODEL = "cerebras/qwen-3-235b-a22b-instruct-2507";

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
 *
 * Note: This intentionally counts only text tokens. Non-text content (images,
 * files) is not counted, so image-bearing messages stay in the verbatim window
 * longer. This is a deliberate trade-off — better conversation quality by
 * preserving visual context, at the cost of slightly higher token usage for
 * image-heavy conversations.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

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

function isToolCallJson(content: string): boolean {
  if (!content.startsWith("{")) return false;
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null && "tool_calls" in parsed;
  } catch {
    return false;
  }
}

function formatMessagesForPrompt(messages: StoredMessage[]): string {
  return messages
    .filter((msg) => msg.role !== "system")
    .filter((msg) => msg.content.trim().length > 0)
    .map((msg) => {
      const role = msg.role === "user" ? "Human" : "AI";
      const content = msg.content.trim();
      if (role === "AI" && isToolCallJson(content)) {
        return `${role}: [used a tool]`;
      }
      return `${role}: ${content}`;
    })
    .join("\n");
}

function buildSummarizationPrompt(
  existingSummary: string | undefined,
  newMessages: StoredMessage[]
): string {
  const summary = existingSummary || "No previous summary.";
  const newLines = formatMessagesForPrompt(newMessages);
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
  let cutoffIndex = messages.length;

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
    if (i === 0) {
      cutoffIndex = 0;
    }
  }

  return {
    toSummarize: messages.slice(0, cutoffIndex),
    window: messages.slice(cutoffIndex),
  };
}

interface SummarizeOptions {
  cachedSummary: StoredConversationSummary | null;
  unsummarizedMessages: StoredMessage[];
  tokenThreshold: number;
  minWindowMessages: number;
  callLlm: (prompt: string, model: string) => Promise<string>;
  model: string;
  redactor?: PiiRedactor;
  onPiiRedacted?: (matches: PiiMatch[]) => void;
}

interface SummarizeResult {
  summary: string | null;
  summarizedUpTo: string | null;
  summaryTokenCount: number;
  windowMessages: StoredMessage[];
  didSummarize: boolean;
}

async function redactSummaryPrompt(
  prompt: string,
  redactor: PiiRedactor | undefined,
  onPiiRedacted?: (matches: PiiMatch[]) => void
): Promise<string> {
  if (!redactor) return prompt;
  const { text, matches } = await redactor.redactTextAsync(prompt);
  if (matches.length > 0 && onPiiRedacted) {
    try {
      onPiiRedacted(matches);
    } catch {
      /* observer error, swallow — same philosophy as runToolLoop's hooks */
    }
  }
  return text;
}

export async function progressiveSummarize(options: SummarizeOptions): Promise<SummarizeResult> {
  const {
    cachedSummary,
    unsummarizedMessages,
    tokenThreshold,
    minWindowMessages,
    callLlm,
    model,
    redactor,
    onPiiRedacted,
  } = options;

  const cachedTokens = cachedSummary?.tokenCount ?? 0;
  const messagesTokens = estimateMessagesTokens(unsummarizedMessages);
  const totalTokens = cachedTokens + messagesTokens;

  if (totalTokens <= tokenThreshold) {
    return {
      summary: cachedSummary?.summary ?? null,
      summarizedUpTo: cachedSummary?.summarizedUpTo ?? null,
      summaryTokenCount: cachedTokens,
      windowMessages: unsummarizedMessages,
      didSummarize: false,
    };
  }

  const windowBudget = Math.max(0, tokenThreshold - cachedTokens);
  let { toSummarize, window } = splitMessagesAtThreshold(
    unsummarizedMessages,
    windowBudget,
    minWindowMessages
  );

  if (toSummarize.length > MAX_MESSAGES_PER_SUMMARIZATION) {
    const excess = toSummarize.slice(MAX_MESSAGES_PER_SUMMARIZATION);
    toSummarize = toSummarize.slice(0, MAX_MESSAGES_PER_SUMMARIZATION);
    window = [...excess, ...window];
  }

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
    const promptForModel = await redactSummaryPrompt(prompt, redactor, onPiiRedacted);
    const rawSummary = await callLlm(promptForModel, model);
    const newSummary = redactor ? redactor.deAnonymize(rawSummary) : rawSummary;
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

  const controller = new AbortController();

  const doRequest = async (): Promise<string> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...taskTypeHeader("summarize"),
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: INTERNAL_FLOW_MARKER },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Summarization LLM call failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    };

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

const lastCompactionTime = new Map<string, number>();

const COMPACTION_COOLDOWN_MS = 60_000;

const MAX_SUMMARY_TOKEN_RATIO = 0.8;

interface MaybeSummarizeHistoryOptions {
  database: Database;
  conversationId: string;
  messages: StoredMessage[];
  summarizeHistory: boolean;
  summaryTokenThreshold: number;
  summaryMinWindowMessages: number;
  summaryModel: string;
  token: string;
  baseUrl?: string;
  redactor?: PiiRedactor;
  onPiiRedacted?: (matches: PiiMatch[]) => void;
}

interface MaybeSummarizeHistoryResult {
  messagesToConvert: StoredMessage[];
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
  const { database, conversationId, messages, summarizeHistory, summaryMinWindowMessages, token } =
    options;

  if (!summarizeHistory) {
    return { messagesToConvert: messages, summarySystemMessage: null };
  }

  if (!token) {
    getLogger().warn("[summarize] No auth token available, skipping summarization");
    return { messagesToConvert: messages, summarySystemMessage: null };
  }

  if (messages.length <= summaryMinWindowMessages) {
    try {
      const summaryCtx = createSummaryContext(database);
      const cachedSummary = await getConversationSummaryOp(summaryCtx, conversationId);
      return {
        messagesToConvert: messages,
        summarySystemMessage: cachedSummary?.summary
          ? summaryToSystemMessage(cachedSummary.summary)
          : null,
      };
    } catch {
      return { messagesToConvert: messages, summarySystemMessage: null };
    }
  }

  const inProgress = summarizationLocks.get(conversationId);
  if (inProgress) {
    const verbatimFallback: MaybeSummarizeHistoryResult = {
      messagesToConvert: messages,
      summarySystemMessage: null,
    };
    let staleGuardTimerId: ReturnType<typeof setTimeout>;
    const staleGuard = new Promise<MaybeSummarizeHistoryResult>((resolve) => {
      staleGuardTimerId = setTimeout(() => resolve(verbatimFallback), 15_000);
    });
    const observedInProgress = inProgress.catch((err: unknown) => {
      getLogger().warn("[summarize] in-progress summarization rejected", err);
      return verbatimFallback;
    });
    try {
      return await Promise.race([observedInProgress, staleGuard]);
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

const COMPACTION_PROMPT = `The following conversation summary has grown too long. Condense it to be more concise while preserving all key facts, decisions, user preferences, and important context. Target roughly half the current length.

Summary to condense:
{summary}

Condensed summary:`;

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
    redactor,
    onPiiRedacted,
  } = options;

  try {
    const summaryCtx = createSummaryContext(database);
    let cachedSummary = await getConversationSummaryOp(summaryCtx, conversationId);

    const lastCompacted = lastCompactionTime.get(conversationId) ?? 0;
    const compactionCooledDown = Date.now() - lastCompacted > COMPACTION_COOLDOWN_MS;
    if (
      cachedSummary &&
      cachedSummary.tokenCount > summaryTokenThreshold * MAX_SUMMARY_TOKEN_RATIO &&
      compactionCooledDown
    ) {
      try {
        const [before, after] = COMPACTION_PROMPT.split("{summary}");
        const compactPrompt = before + cachedSummary.summary + after;
        const promptForModel = await redactSummaryPrompt(compactPrompt, redactor, onPiiRedacted);
        const rawCompacted = await callSummarizationLlm(
          promptForModel,
          summaryModel,
          token,
          baseUrl
        );
        const compactedSummary = redactor ? redactor.deAnonymize(rawCompacted) : rawCompacted;
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
        lastCompactionTime.set(conversationId, Date.now());
        getLogger().warn(
          "[summarize] Summary compaction failed, proceeding with oversized summary"
        );
      }
    }

    let unsummarized: StoredMessage[];
    if (cachedSummary?.summarizedUpTo) {
      const cutoffIndex = messages.findIndex(
        (msg) => msg.uniqueId === cachedSummary.summarizedUpTo
      );
      if (cutoffIndex >= 0) {
        unsummarized = messages.slice(cutoffIndex + 1);
      } else {
        unsummarized = messages;
      }
    } else {
      unsummarized = messages;
    }

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
      redactor,
      onPiiRedacted,
    });

    if (summarizeResult.didSummarize && summarizeResult.summary && summarizeResult.summarizedUpTo) {
      await upsertConversationSummaryOp(
        summaryCtx,
        conversationId,
        summarizeResult.summary,
        summarizeResult.summarizedUpTo,
        summarizeResult.summaryTokenCount
      );
    }

    let messagesToConvert: StoredMessage[] = unsummarized;
    if (
      summarizeResult.didSummarize &&
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
    getLogger().warn("[summarize] Summarization failed, falling back to verbatim:", err);
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
    getLogger().warn("[summarize] Failed to delete conversation summary cache:", err);
  }
}
