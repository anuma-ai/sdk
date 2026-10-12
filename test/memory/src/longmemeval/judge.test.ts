import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerFailureReason, evaluateAnswer, summarizeJudgment } from "./judge.js";
import type { ApiConfig } from "./types.js";

const API: ApiConfig = {
  apiKey: "test-key",
  baseUrl: "https://portal.test",
  llmModel: "gpt-oss/gpt-oss-120b",
};

const FAST = { baseDelayMs: 0 } as const;

type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number };

function completion(
  content: string,
  extra?: { finish_reason?: string; usage?: Usage }
): { ok: true; status: 200; json: () => Promise<unknown> } {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content }, finish_reason: extra?.finish_reason ?? "stop" }],
      ...(extra?.usage && { usage: extra.usage }),
    }),
  };
}

function httpError(status: number): { ok: false; status: number; json: () => Promise<unknown> } {
  return { ok: false, status, json: async () => ({ error: "boom" }) };
}

function stubFetch(...responses: unknown[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  const last = responses[responses.length - 1];
  if (last instanceof Error) fetchMock.mockRejectedValue(last);
  else fetchMock.mockResolvedValue(last);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, index: number): any {
  return JSON.parse(fetchMock.mock.calls[index][1].body);
}

function judge(options: Record<string, unknown> = {}) {
  return evaluateAnswer("Where does the user live?", "Lisbon", "The user lives in Lisbon.", API, {
    ...FAST,
    ...options,
  });
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("evaluateAnswer request shape", () => {
  it("sends a completion budget big enough for a reasoning model to reach the verdict", async () => {
    const fetchMock = stubFetch(completion("CORRECT"));
    await judge();

    const body = requestBody(fetchMock, 0);
    expect(body.max_completion_tokens).toBeGreaterThanOrEqual(1000);
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBe(0);
  });

  it("judges with llmModel by default and with judgeModel when one is configured", async () => {
    const fetchMock = stubFetch(completion("CORRECT"));
    await judge();
    expect(requestBody(fetchMock, 0).model).toBe("gpt-oss/gpt-oss-120b");

    const otherFetch = stubFetch(completion("CORRECT"));
    await evaluateAnswer("q", "a", "a", { ...API, judgeModel: "openai/gpt-5-mini" }, FAST);
    expect(requestBody(otherFetch, 0).model).toBe("openai/gpt-5-mini");
  });
});

describe("evaluateAnswer verdicts", () => {
  it("returns correct for a bare CORRECT and propagates token usage", async () => {
    stubFetch(
      completion("CORRECT", {
        usage: { prompt_tokens: 120, completion_tokens: 3, total_tokens: 123 },
      })
    );

    const result = await judge();

    expect(result.verdict).toBe("correct");
    expect(result.reason).toBeUndefined();
    expect(result.usage).toEqual({ prompt_tokens: 120, completion_tokens: 3, total_tokens: 123 });
  });

  it("returns incorrect for a bare INCORRECT, with no judge error attached", async () => {
    stubFetch(completion("INCORRECT"));

    const result = await judge();

    expect(result.verdict).toBe("incorrect");
    expect(result.reason).toBeUndefined();
  });

  it("reads the verdict out of prose, markdown and mixed case", async () => {
    const cases: Array<[string, "correct" | "incorrect"]> = [
      ["The generated answer is CORRECT.", "correct"],
      ["**CORRECT**", "correct"],
      ["  correct\n", "correct"],
      ["Verdict: INCORRECT — the answer names the wrong city.", "incorrect"],
      ["This is incorrect.", "incorrect"],
    ];

    for (const [content, expected] of cases) {
      stubFetch(completion(content));
      await expect(judge()).resolves.toMatchObject({ verdict: expected });
    }
  });

  it("does not read a negated verdict word as a pass", async () => {
    for (const prose of [
      "The generated answer is not correct.",
      "No — that isn't correct; it names the wrong city.",
      "This is not entirely correct.",
      "I don't think this is correct.",
      "I would not say that this is correct.",
      "Based on the expected answer, this is not really what I would call correct.",
      "I don't think that's correct.",
      "No, it's not what I'd call correct.",
      "The answer cannot be considered correct.",
      "This cannot be correct.",
    ]) {
      stubFetch(completion(prose), completion("INCORRECT"));

      await expect(judge()).resolves.toMatchObject({ verdict: "incorrect" });
    }
  });

  it("reports a persistently negated-prose reply as unjudgeable, never as correct", async () => {
    stubFetch(completion("The generated answer is not correct."));

    const result = await judge({ maxAttempts: 2 });

    expect(result.verdict).toBe("unjudgeable");
    expect(result.verdict).not.toBe("correct");
  });
});

describe("evaluateAnswer failure modes never score as a wrong answer", () => {
  it("reports a starved completion as unjudgeable and names the finish_reason", async () => {
    const fetchMock = stubFetch(completion("", { finish_reason: "length" }));

    const result = await judge();

    expect(result.verdict).toBe("unjudgeable");
    expect(result.reason).toMatch(/empty completion content/);
    expect(result.reason).toMatch(/finish_reason=length/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("still reports the tokens a starved judge burned", async () => {
    stubFetch(
      completion("", {
        finish_reason: "length",
        usage: { prompt_tokens: 100, completion_tokens: 6000, total_tokens: 6100 },
      })
    );

    const result = await judge({ maxAttempts: 2 });

    expect(result.verdict).toBe("unjudgeable");
    expect(result.usage).toEqual({
      prompt_tokens: 200,
      completion_tokens: 12_000,
      total_tokens: 12_200,
    });
  });

  it("retries a 5xx and reports unjudgeable once the budget runs out", async () => {
    const fetchMock = stubFetch(httpError(500));

    const result = await judge();

    expect(result.verdict).toBe("unjudgeable");
    expect(result.reason).toMatch(/HTTP 500/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("recovers when a transient 5xx is followed by a real verdict", async () => {
    const fetchMock = stubFetch(httpError(503), completion("INCORRECT"));

    const result = await judge();

    expect(result.verdict).toBe("incorrect");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails fast on a deterministic 4xx instead of burning the retry ladder", async () => {
    for (const status of [400, 401, 403, 404]) {
      const fetchMock = stubFetch(httpError(status));

      const result = await judge();

      expect(result.verdict).toBe("unjudgeable");
      expect(result.reason).toMatch(new RegExp(`HTTP ${status}`));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("reports a network failure as unjudgeable and carries the error message", async () => {
    const fetchMock = stubFetch(new TypeError("fetch failed: ECONNRESET"));

    const result = await judge();

    expect(result.verdict).toBe("unjudgeable");
    expect(result.reason).toMatch(/ECONNRESET/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reports a malformed response body as unjudgeable", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    const result = await judge({ maxAttempts: 2 });

    expect(result.verdict).toBe("unjudgeable");
    expect(result.reason).toMatch(/Unexpected token/);
  });

  it("treats a response with no choices as unjudgeable", async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({ choices: [] }) });

    const result = await judge({ maxAttempts: 1 });

    expect(result.verdict).toBe("unjudgeable");
  });

  it("retries an unparseable reply with a reinforced prompt before giving up", async () => {
    const fetchMock = stubFetch(
      completion("Let me think about whether these two answers line up."),
      completion("Hmm, hard to say either way.")
    );

    const result = await judge({ maxAttempts: 2 });

    expect(result.verdict).toBe("unjudgeable");
    expect(result.reason).toMatch(/unparseable verdict/);
    expect(requestBody(fetchMock, 0).messages).toHaveLength(1);
    const retryMessages = requestBody(fetchMock, 1).messages;
    expect(retryMessages).toHaveLength(2);
    expect(retryMessages[0].role).toBe("system");
    expect(retryMessages[0].content).toMatch(/CORRECT or INCORRECT/);
  });

  it("recovers when the reinforced retry produces a clean verdict", async () => {
    stubFetch(completion("I'd need to see more context."), completion("CORRECT"));

    await expect(judge()).resolves.toMatchObject({ verdict: "correct" });
  });

  it("keeps the reinforcement on for the rest of the attempt budget", async () => {
    const fetchMock = stubFetch(completion("Hard to say."));

    const result = await judge();

    expect(result.verdict).toBe("unjudgeable");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const attempt of [1, 2, 3]) {
      const messages = requestBody(fetchMock, attempt).messages;
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toMatch(/CORRECT or INCORRECT/);
    }
  });

  it("refuses to guess when a reply contains both verdict words", async () => {
    stubFetch(completion("This is CORRECT, definitely not INCORRECT."));

    const result = await judge({ maxAttempts: 2 });

    expect(result.verdict).toBe("unjudgeable");
    expect(result.reason).toMatch(/unparseable verdict/);
  });

  it("aborts a hung request rather than stalling the run forever", async () => {
    const fetchMock = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted", "AbortError"))
          );
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await judge({ timeoutMs: 5, maxAttempts: 1 });

    expect(result.verdict).toBe("unjudgeable");
    expect(result.reason).toMatch(/timed out after 5ms/);
  });

  it("never returns the verdict incorrect for any failure shape", async () => {
    const failures: unknown[] = [
      completion(""),
      completion("", { finish_reason: "length" }),
      httpError(400),
      httpError(429),
      httpError(500),
      new TypeError("network down"),
      completion("I am not sure how to answer that."),
    ];

    for (const failure of failures) {
      stubFetch(failure);
      const result = await judge({ maxAttempts: 2 });
      expect(result.verdict).toBe("unjudgeable");
      expect(result.verdict).not.toBe("incorrect");
      expect(result.reason).toBeTruthy();
    }
  });
});

describe("answerFailureReason", () => {
  it("reports an empty answer rather than letting it be graded as a wrong answer", () => {
    expect(answerFailureReason("")).toMatch(/no content/);
    expect(answerFailureReason("   \n ")).toMatch(/no content/);
  });

  it("reports a thrown answer call and carries the message", () => {
    expect(answerFailureReason("", new Error("Chat completion failed: 503"))).toBe(
      "answer generation failed: Chat completion failed: 503"
    );
  });

  it("prefers the thrown reason even when a partial answer survived", () => {
    expect(answerFailureReason("Lisbon", new Error("ECONNRESET"))).toMatch(/ECONNRESET/);
  });

  it("returns undefined for a real answer so normal questions still get judged", () => {
    expect(answerFailureReason("The user lives in Lisbon.")).toBeUndefined();
    expect(answerFailureReason("I don't know.")).toBeUndefined();
  });
});

describe("summarizeJudgment", () => {
  const correct = { isCorrect: true };
  const wrong = { isCorrect: false };
  const unjudged = { isCorrect: false, judgeError: "HTTP 500 from the judge model" };
  const unanswered = { isCorrect: false, answerError: "answer generation returned no content" };

  it("scores accuracy over the judged questions, not all of them", () => {
    expect(summarizeJudgment([correct, correct, wrong, unjudged, unjudged])).toEqual({
      total: 5,
      judged: 3,
      correct: 2,
      judgeFailures: 2,
      answerFailures: 0,
      harnessFailures: 0,
      accuracy: 2 / 3,
    });
  });

  it("excludes questions that never produced an answer, and counts them separately", () => {
    expect(summarizeJudgment([correct, wrong, unanswered, unjudged])).toEqual({
      total: 4,
      judged: 2,
      correct: 1,
      judgeFailures: 1,
      answerFailures: 1,
      harnessFailures: 0,
      accuracy: 0.5,
    });
  });

  it("counts a question only once when both steps are flagged", () => {
    const both = { isCorrect: false, judgeError: "HTTP 500", answerError: "no content" };

    expect(summarizeJudgment([correct, both])).toEqual({
      total: 2,
      judged: 1,
      correct: 1,
      judgeFailures: 0,
      answerFailures: 1,
      harnessFailures: 0,
      accuracy: 1,
    });
  });

  it("reports zero accuracy over zero judged questions when the judge is fully dead", () => {
    expect(summarizeJudgment([unjudged, unjudged, unjudged])).toEqual({
      total: 3,
      judged: 0,
      correct: 0,
      judgeFailures: 3,
      answerFailures: 0,
      harnessFailures: 0,
      accuracy: 0,
    });
  });

  it("is unchanged from plain accuracy on a healthy run", () => {
    expect(summarizeJudgment([correct, correct, wrong, wrong])).toEqual({
      total: 4,
      judged: 4,
      correct: 2,
      judgeFailures: 0,
      answerFailures: 0,
      harnessFailures: 0,
      accuracy: 0.5,
    });
  });

  it("handles an empty result set without emitting NaN", () => {
    expect(summarizeJudgment([])).toEqual({
      total: 0,
      judged: 0,
      correct: 0,
      judgeFailures: 0,
      answerFailures: 0,
      harnessFailures: 0,
      accuracy: 0,
    });
  });

  it("keeps a crashed entry out of the denominator instead of scoring it a miss", () => {
    const crashed = { isCorrect: false, harnessError: "LokiJSAdapter: db closed" };

    expect(summarizeJudgment([correct, wrong, crashed, crashed])).toEqual({
      total: 4,
      judged: 2,
      correct: 1,
      judgeFailures: 0,
      answerFailures: 0,
      harnessFailures: 2,
      accuracy: 0.5,
    });
  });

  it("counts a crashed entry once even when other error keys are also set", () => {
    const messy = {
      isCorrect: false,
      harnessError: "crashed",
      answerError: "empty",
      judgeError: "unjudgeable",
    };

    expect(summarizeJudgment([correct, messy])).toEqual({
      total: 2,
      judged: 1,
      correct: 1,
      judgeFailures: 0,
      answerFailures: 0,
      harnessFailures: 1,
      accuracy: 1,
    });
  });
});
