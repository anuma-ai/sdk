/**
 * LongMemEval Answer Judge
 *
 * The LLM-as-judge step that turns a generated answer into a verdict. Split
 * out of suite.ts so its failure semantics can be exercised against a stubbed
 * fetch without pulling in the WatermelonDB/strategy module graph.
 *
 * The contract that matters: a judge that could not reach a verdict returns
 * `unjudgeable`, NEVER `incorrect`. Silently scoring a judge outage as a wrong
 * answer is what let a 50-question oracle run report 0.0% accuracy beside 95%
 * retrieval recall — every question type flattened to exactly zero, with
 * nothing in the output to separate "the memory system answered badly" from
 * "the judge never answered at all".
 *
 * The same module owns `answerFailureReason` and `summarizeJudgment`, because
 * the answer step one call upstream can fail just as quietly and has to land
 * in the same place: outside the accuracy denominator, named in the output.
 */

import type { ApiConfig } from "./types.js";

export type JudgeVerdict = "correct" | "incorrect" | "unjudgeable";

export interface JudgeResult {
  verdict: JudgeVerdict;
  /** Why no verdict was reached. Set only when `verdict` is "unjudgeable";
   *  it is what the per-question result and the reporter surface. */
  reason?: string;
  /** Tokens spent judging, summed across attempts. Reported even for an
   *  unjudgeable result — a starved reasoning model still burns completion
   *  tokens, and dropping them would understate the run's cost. */
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface JudgeOptions {
  /** Attempts before giving up. Default 4. Once a reply comes back
   *  unparseable every remaining attempt is sent reinforced (see
   *  VERDICT_ONLY_SYSTEM_PROMPT) — a model that has started answering in prose
   *  keeps doing it, and the extra attempts are the only thing that recovers
   *  the question. */
  maxAttempts?: number;
  /** Base backoff between attempts, doubled per retry (and doubled again on
   *  a 429). Default 500ms. */
  baseDelayMs?: number;
  /** Per-request abort timeout. Default 60s, matching callChatCompletion —
   *  without one a hung connection stalls a whole concurrent run. */
  timeoutMs?: number;
}

/**
 * 6000, not 10. Reasoning tokens count against this cap, so a 10-token budget
 * is consumed entirely by hidden reasoning on the gpt-oss / gpt-5 families and
 * the completion comes back with EMPTY content and finish_reason "length" —
 * the same starvation the extraction path was hardened against in
 * suite.ts:extractMemoriesFromSession. The cap was harmless while the harness
 * sent the deprecated `max_tokens` field (the portal ignored it, so the judge
 * effectively ran uncapped); the moment it became `max_completion_tokens` the
 * portal started honoring it and every judgment came back blank. The verdict
 * itself is one token, so the budget only has to cover reasoning.
 */
const JUDGE_MAX_COMPLETION_TOKENS = 6000;

/** Reinforcement for the retries after an unparseable response. At temperature
 *  0 a bare retry replays the same prose, so the request has to change to be
 *  worth spending an attempt on (same trick as the extraction path). Once it is
 *  switched on it stays on for the rest of the attempt budget — a model that
 *  answered in prose once will do it again, and dropping the reinforcement
 *  would just buy another unparseable reply. */
const VERDICT_ONLY_SYSTEM_PROMPT =
  "Reply with exactly one word: CORRECT or INCORRECT. No explanation, no punctuation, no markdown.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 429 and 5xx are transient; everything else in the 4xx range is
 * deterministic (bad model id, dead key, malformed request) and will fail
 * identically on every retry, so failing fast keeps a misconfigured run from
 * burning the full backoff ladder on every one of 500 questions.
 */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * A verdict word the surrounding prose directly negates — "not correct",
 * "isn't correct", "not entirely correct". Matched separately because the bare
 * word-boundary scan below sees only the token CORRECT and would read the
 * sentence as a pass, and a false pass is the one direction of parse error
 * that inflates the score instead of deflating it.
 *
 * Up to six words may sit between the negation and the verdict. Two was the
 * first guess and it was too tight: a hedged negative is the single most common
 * shape a chat model reaches for, and "I don't think this is correct" puts four
 * words in the gap, so the negation was missed and the trailing CORRECT scored
 * as a pass. Widening costs only a false *unjudgeable* on a sentence where an
 * unrelated NOT precedes a verdict word within six tokens, which retries and
 * then drops out of the denominator. Missing a negation costs a false pass that
 * silently inflates the benchmark. The asymmetry is the whole reason this regex
 * exists, so it errs toward refusing to rule.
 *
 * The contraction alternative carries no leading `\b` on purpose — in "isn't"
 * the N sits mid-word, so a word boundary there never matches. Both apostrophe
 * characters are accepted because models emit either.
 *
 * The gap matches `\S+` rather than `\w+` because `\w` excludes apostrophes, so
 * a single contraction anywhere in the window ("I don't think that's correct")
 * broke the repetition and dropped the whole match — the same silent pass the
 * negation guard exists to prevent, reintroduced by the tokenizer. Anything
 * non-whitespace counts as one gap token now.
 */
const NEGATED_VERDICT = /(?:\bNOT|N['’]T|\bNEVER)\s+(?:\S+\s+){0,6}(?:IN)?CORRECT\b/;

/**
 * Read a verdict out of the judge's response.
 *
 * Word-boundary matched, so `**CORRECT**` and "The generated answer is
 * CORRECT." both parse, and the "CORRECT" inside "INCORRECT" doesn't produce a
 * phantom second verdict. Anything the parser cannot resolve — both words
 * present, a negated verdict word, no verdict word at all — returns null and
 * is retried with the reinforcement prompt, then reported as unjudgeable. The
 * old substring test (`includes("CORRECT") && !includes("INCORRECT")`)
 * resolved every one of those cases, including an empty string, to
 * "incorrect".
 *
 * This is deliberately not a prose comprehension attempt: hedging the regex
 * can't reach ("not sure this is correct") stays out of reach, which is why
 * the reinforced retry exists rather than a cleverer pattern. What it must
 * never do is return a confident verdict it inferred.
 */
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

  /** Never throws: the per-entry catch in the suite converts a thrown error
   *  into a zero-scored result with isCorrect=false, which would reintroduce
   *  the silent swallow through the back door. */
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

/**
 * Why the answer step produced nothing worth judging, or undefined when it
 * produced a real answer.
 *
 * The judge is not the only step that can fail quietly. The answer calls in
 * suite.ts:callChatCompletion carry a completion cap that #760 armed the same
 * way it armed the judge's — it swapped the deprecated `max_tokens`, which the
 * portal dropped, for `max_completion_tokens`, which the portal honors. A
 * reasoning model that spends the whole budget on hidden reasoning returns
 * empty content, and an empty answer grades as a perfectly ordinary wrong
 * answer: no error, no marker, a clean exit and a published summary. That is
 * the same "cannot tell a broken step from a bad memory system" failure the
 * judge had, one call upstream, so it lands in the same unscored bucket
 * instead of in the accuracy denominator.
 *
 * Lives here rather than in suite.ts because it is pure and because it feeds
 * summarizeJudgment below — the two have to agree on what "unscored" means.
 */
export function answerFailureReason(generatedAnswer: string, thrown?: unknown): string | undefined {
  if (thrown !== undefined) {
    return `answer generation failed: ${thrown instanceof Error ? thrown.message : String(thrown)}`;
  }
  if (!generatedAnswer.trim()) {
    return "answer generation returned no content (starved completion budget, or the model emitted no answer)";
  }
  return undefined;
}

/** The scored fields of a per-question result, as the tallies read them. */
export interface JudgedOutcome {
  isCorrect: boolean;
  judgeError?: string;
  answerError?: string;
}

export interface JudgmentTally {
  total: number;
  /** Questions that produced a verdict either way. */
  judged: number;
  correct: number;
  judgeFailures: number;
  answerFailures: number;
  /** Share of the JUDGED questions that were correct. Unscored questions are
   *  excluded from the denominator rather than counted as misses — folding
   *  them in is what turned a dead judge into a plausible-looking 0.0%. Zero
   *  when nothing was judged; callers distinguish that case via `judged`. */
  accuracy: number;
}

export function summarizeJudgment(results: readonly JudgedOutcome[]): JudgmentTally {
  // The two buckets are disjoint by construction — a question whose answer
  // step failed is never sent to the judge — but deriving judgeFailures with
  // the exclusion anyway keeps `judged = total - judgeFailures -
  // answerFailures` true no matter what a caller does, and the reporter
  // subtracts exactly that.
  const answerFailures = results.filter((r) => r.answerError !== undefined).length;
  const judgeFailures = results.filter(
    (r) => r.answerError === undefined && r.judgeError !== undefined
  ).length;
  const judged = results.length - answerFailures - judgeFailures;
  const correct = results.filter((r) => r.isCorrect).length;
  return {
    total: results.length,
    judged,
    correct,
    judgeFailures,
    answerFailures,
    accuracy: judged > 0 ? correct / judged : 0,
  };
}
