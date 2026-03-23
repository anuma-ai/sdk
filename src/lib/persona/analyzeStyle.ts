import type { AnalyzeStyleOptions, AnalyzeStyleResult, StyleAnalysisSchedule } from "./types";

// ── Defaults ──

export const DEFAULT_ANALYSIS_PROMPT =
  "Analyze these user messages and describe their communication style in 1-2 concise sentences. Focus on: tone (formal/casual/playful), message length preference, vocabulary level, and any notable patterns. Output only the style description, nothing else.";

export const DEFAULT_MAX_INPUT_MESSAGES = 10;
export const DEFAULT_MIN_MESSAGES = 3;
export const DEFAULT_MAX_PROFILE_LENGTH = 200;
export const DEFAULT_ANALYZE_AFTER_MESSAGES = 5;
export const DEFAULT_REFRESH_EVERY_MESSAGES = 20;
export const DEFAULT_DOCUMENT_PATTERN = /^Here is the user's (?:CSV data|[A-Z]+ content):/;

// ── shouldAnalyzeStyle ──

export function shouldAnalyzeStyle(schedule: StyleAnalysisSchedule): boolean {
  const threshold = schedule.analyzeAfterMessages ?? DEFAULT_ANALYZE_AFTER_MESSAGES;
  const refresh = schedule.refreshEveryMessages ?? DEFAULT_REFRESH_EVERY_MESSAGES;

  if (schedule.optedOut) return false;

  // Cold start: no profile, never analyzed
  if (!schedule.hasProfile && !schedule.hasBeenAnalyzed) {
    return schedule.messageCount >= threshold;
  }

  // Refresh: has a profile, periodic re-analysis
  if (schedule.hasProfile) {
    return schedule.messageCount % refresh === 0;
  }

  return false;
}

// ── Internals ──

function extractUserMessages(
  messages: Array<{ role: string; content: string }>,
  maxCount: number,
  documentPattern: RegExp
): string[] {
  const result: string[] = [];
  for (let i = messages.length - 1; i >= 0 && result.length < maxCount; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (!msg.content) continue;
    if (documentPattern.test(msg.content)) continue;
    result.push(msg.content);
  }
  return result.reverse();
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > maxLength * 0.5 ? truncated.slice(0, lastSpace) : truncated;
}

// ── analyzeStyle ──

export async function analyzeStyle(options: AnalyzeStyleOptions): Promise<AnalyzeStyleResult> {
  const maxInput = options.maxInputMessages ?? DEFAULT_MAX_INPUT_MESSAGES;
  const minMessages = options.minMessages ?? DEFAULT_MIN_MESSAGES;
  const maxProfileLength = options.maxProfileLength ?? DEFAULT_MAX_PROFILE_LENGTH;
  const analysisPrompt = options.analysisPrompt ?? DEFAULT_ANALYSIS_PROMPT;
  const documentPattern = options.documentPattern ?? DEFAULT_DOCUMENT_PATTERN;

  const userMessages = extractUserMessages(options.messages, maxInput, documentPattern);
  if (userMessages.length < minMessages) return { profile: null };

  const numbered = userMessages.map((m, i) => `${i + 1}. ${m}`).join("\n");

  const result = await options.callLlm([
    { role: "system", content: analysisPrompt },
    { role: "user", content: numbered },
  ]);

  if (!result) return { profile: null };

  const profile = truncateAtWordBoundary(result.trim(), maxProfileLength);
  return { profile };
}
