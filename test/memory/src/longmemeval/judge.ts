import type { ApiConfig } from "./types.js";

export type JudgeVerdict = "correct" | "incorrect" | "unjudgeable";

export interface JudgeResult {
  verdict: JudgeVerdict;
  reason?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface JudgeOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

const JUDGE_MAX_COMPLETION_TOKENS = 6000;

const VERDICT_ONLY_SYSTEM_PROMPT =
  "Reply with exactly one word: CORRECT or INCORRECT. No explanation, no punctuation, no markdown.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const NEGATED_VERDICT = /(?:NOT|N['’]T|\bNEVER)\s+(?:\S+\s+){0,6}(?:IN)?CORRECT\b/;

function parseVerdict(content: string): "correct" | "incorrect" | null {
  const upper = content.toUpperCase();
  if (NEGATED_VERDICT.test(upper)) return null;
  const matches = upper.match(/\b(?:INCORRECT|CORRECT)\b/g);
  if (!matches) return null;
  const distinct = new Set(matches);
  if (distinct.size !== 1) return null;
  return distinct.has("INCORRECT") ? "incorrect" : "correct";
}

export async function evaluateAnswer(
  question: string,
  expectedAnswer: string,
  generatedAnswer: string,
  api: ApiConfig,
  options?: JudgeOptions
): Promise<JudgeResult> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const model = api.judgeModel ?? api.llmModel;

  const prompt = `You are an answer evaluator. Determine if the generated answer correctly answers the question, matching the expected answer's meaning.

Question: ${question}
Expected Answer: ${expectedAnswer}
Generated Answer: ${generatedAnswer}

Does the generated answer correctly capture the same information as the expected answer?
Consider partial matches as correct if the key information is present.

Respond with ONLY "CORRECT" or "INCORRECT".`;

  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let sawUsage = false;
  let reinforce = false;
  let lastStatus: number | null = null;
  let lastReason = "no attempt completed";

  const unjudgeable = (reason: string): JudgeResult => {
    console.warn(`  ⚠ judge unavailable: ${reason}`);
    return { verdict: "unjudgeable", reason, ...(sawUsage && { usage }) };
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const base = lastStatus === 429 ? baseDelayMs * 2 : baseDelayMs;
      const exp = base * 2 ** (attempt - 2);
      await sleep(Math.min(15_000, exp + Math.random() * 0.4 * exp));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": api.apiKey,
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(reinforce ? [{ role: "system", content: VERDICT_ONLY_SYSTEM_PROMPT }] : []),
            { role: "user", content: prompt },
          ],
          temperature: 0,
          max_completion_tokens: JUDGE_MAX_COMPLETION_TOKENS,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastReason = `HTTP ${response.status} from the judge model (${model})`;
        if (!isRetryableStatus(response.status)) {
          return unjudgeable(`${lastReason} — not retryable`);
        }
        continue;
      }
      lastStatus = null;

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };
      if (data.usage) {
        sawUsage = true;
        usage.prompt_tokens += data.usage.prompt_tokens ?? 0;
        usage.completion_tokens += data.usage.completion_tokens ?? 0;
        usage.total_tokens += data.usage.total_tokens ?? 0;
      }

      const choice = data.choices?.[0];
      const content = choice?.message?.content ?? "";
      if (!content.trim()) {
        lastReason = `empty completion content (finish_reason=${choice?.finish_reason ?? "?"})`;
        continue;
      }

      const verdict = parseVerdict(content);
      if (verdict) return { verdict, ...(sawUsage && { usage }) };

      lastReason = `unparseable verdict: ${JSON.stringify(content.trim().slice(0, 120))}`;
      reinforce = true;
    } catch (error) {
      lastReason = controller.signal.aborted
        ? `judge request timed out after ${timeoutMs}ms`
        : `judge request failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      clearTimeout(timer);
    }
  }

  return unjudgeable(`${lastReason} (after ${maxAttempts} attempts)`);
}

export function answerFailureReason(generatedAnswer: string, thrown?: unknown): string | undefined {
  if (thrown !== undefined) {
    return `answer generation failed: ${thrown instanceof Error ? thrown.message : String(thrown)}`;
  }
  if (!generatedAnswer.trim()) {
    return "answer generation returned no content (starved completion budget, or the model emitted no answer)";
  }
  return undefined;
}

export interface JudgedOutcome {
  isCorrect: boolean;
  judgeError?: string;
  answerError?: string;
  harnessError?: string;
}

export interface JudgmentTally {
  total: number;
  judged: number;
  correct: number;
  judgeFailures: number;
  answerFailures: number;
  harnessFailures: number;
  accuracy: number;
}

export function summarizeJudgment(results: readonly JudgedOutcome[]): JudgmentTally {
  const harnessFailures = results.filter((r) => r.harnessError !== undefined).length;
  const answerFailures = results.filter(
    (r) => r.harnessError === undefined && r.answerError !== undefined
  ).length;
  const judgeFailures = results.filter(
    (r) => r.harnessError === undefined && r.answerError === undefined && r.judgeError !== undefined
  ).length;
  const judged = results.length - harnessFailures - answerFailures - judgeFailures;
  const correct = results.filter((r) => r.isCorrect).length;
  return {
    total: results.length,
    judged,
    correct,
    judgeFailures,
    answerFailures,
    harnessFailures,
    accuracy: judged > 0 ? correct / judged : 0,
  };
}
