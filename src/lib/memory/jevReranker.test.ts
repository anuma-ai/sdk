import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_JEV_ENDPOINT,
  DEFAULT_MAX_CONTENT_CHARS,
  makeJevReranker,
  rerankPairsWithJev,
} from "./jevReranker";
import { RerankerUnavailableError } from "./reranker";

/** Build a fetch that records its call and returns `body`. */
function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

/** A System One response scoring candidates in declaration order. */
function answers(...nouls: number[]) {
  return {
    model: "jev-latest",
    answers: Object.fromEntries(nouls.map((n, i) => [`c${i}`, { type: "noul", noul: n }])),
  };
}

const ITEMS = [
  { id: "p19", content: "Lives in Portland, Oregon" },
  { id: "p20", content: "Relocated from Portland to San Francisco in November 2025" },
  { id: "p09", content: "Has a golden retriever named Biscuit" },
];

const AUTH = { apiKey: "test-key" };

function bodyOf(fetchFn: typeof fetch) {
  const call = (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
  return JSON.parse((call[1] as { body: string }).body);
}

describe("rerankPairsWithJev", () => {
  it("sorts by the returned probability, descending", async () => {
    const fetchFn = mockFetch(answers(0.2, 0.9, 0.05));
    const out = await rerankPairsWithJev("where do I live now?", ITEMS, {
      ...AUTH,
      fetchFn,
    });

    expect(out.map((r) => r.id)).toEqual(["p20", "p19", "p09"]);
    expect(out[0].score).toBe(0.9);
    // Content is returned unmodified — the date prefix is an input-side concern.
    expect(out[0].content).toBe(ITEMS[1].content);
  });

  it("asks one question per candidate in a single request", async () => {
    const fetchFn = mockFetch(answers(0.5, 0.5, 0.5));
    await rerankPairsWithJev("q", ITEMS, { ...AUTH, fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const body = bodyOf(fetchFn);
    expect(Object.keys(body.questions)).toEqual(["c0", "c1", "c2"]);
    expect(body.state.candidates).toHaveLength(3);
    expect(body.model).toBe("jev-latest");
    for (const q of Object.values(body.questions) as Array<{ type: string }>) {
      expect(q.type).toBe("noul");
    }
  });

  it("points each question at its own candidate by state path", async () => {
    const fetchFn = mockFetch(answers(0.5, 0.5, 0.5));
    await rerankPairsWithJev("q", ITEMS, { ...AUTH, fetchFn });

    const body = bodyOf(fetchFn);
    expect(body.questions.c1.instructions).toContain("`candidates[1].memory`");
    // Vault ids are never sent: they are user-derived and the model does not
    // need them to answer.
    expect(JSON.stringify(body)).not.toContain("p20");
  });

  it("date-prefixes the candidate the way the cross-encoder does", async () => {
    const fetchFn = mockFetch(answers(0.5));
    await rerankPairsWithJev(
      "q",
      [{ id: "a", content: "Moved to SF", dateMs: Date.UTC(2025, 10, 4, 12) }],
      { ...AUTH, fetchFn }
    );

    expect(bodyOf(fetchFn).state.candidates[0].memory).toMatch(
      /^\[Date: 2025-11-04\] Moved to SF$/
    );
  });

  it("truncates an outsized memory to keep the batch inside the state budget", async () => {
    const long = "x".repeat(DEFAULT_MAX_CONTENT_CHARS + 500);
    const fetchFn = mockFetch(answers(0.5));
    const out = await rerankPairsWithJev("q", [{ id: "a", content: long }], {
      ...AUTH,
      fetchFn,
    });

    expect(bodyOf(fetchFn).state.candidates[0].memory).toHaveLength(DEFAULT_MAX_CONTENT_CHARS);
    // Truncation is input-side only; the caller still gets its own text back.
    expect(out[0].content).toBe(long);
  });

  it("posts to the portal proxy path, not a vendor origin", async () => {
    const fetchFn = mockFetch(answers(0.5));
    await rerankPairsWithJev("q", [ITEMS[0]], {
      ...AUTH,
      baseUrl: "https://portal.example",
      fetchFn,
    });

    const url = (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0];
    expect(url).toBe(`https://portal.example${DEFAULT_JEV_ENDPOINT}`);
  });

  it("sends the api key as x-api-key", async () => {
    const fetchFn = mockFetch(answers(0.5));
    await rerankPairsWithJev("q", [ITEMS[0]], { apiKey: "sekret", fetchFn });

    const init = (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(init.headers["x-api-key"]).toBe("sekret");
  });

  it("reports an unconfigured lane as unavailable, not as a failure", async () => {
    // Same category as "the transformers package isn't bundled": the caller
    // logs at debug and degrades, rather than warning on every recall.
    await expect(rerankPairsWithJev("q", ITEMS, {})).rejects.toBeInstanceOf(
      RerankerUnavailableError
    );
  });

  it("throws a plain error on a non-2xx, so the caller warns and degrades", async () => {
    const fetchFn = mockFetch({}, false, 503);
    const err = await rerankPairsWithJev("q", ITEMS, { ...AUTH, fetchFn }).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(RerankerUnavailableError);
    expect(String(err)).toContain("503");
  });

  it("throws rather than returning an unranked list when answers are missing", async () => {
    const fetchFn = mockFetch({ model: "jev-latest" });
    await expect(rerankPairsWithJev("q", ITEMS, { ...AUTH, fetchFn })).rejects.toThrow(
      /no answers/
    );
  });

  it("scores an unreadable answer 0 instead of dropping the candidate", async () => {
    // Dropping would shorten the head slice and lose a memory the fused
    // ranking had already admitted.
    const fetchFn = mockFetch({
      answers: { c0: { noul: 0.8 }, c1: { noul: "bogus" }, c2: {} },
    });
    const out = await rerankPairsWithJev("q", ITEMS, { ...AUTH, fetchFn });

    expect(out).toHaveLength(3);
    expect(out.find((r) => r.id === "p20")?.score).toBe(0);
    expect(out.find((r) => r.id === "p09")?.score).toBe(0);
  });

  it("clamps an out-of-range probability into the blend's expected range", async () => {
    const fetchFn = mockFetch({
      answers: { c0: { noul: 1.7 }, c1: { noul: -3 }, c2: { noul: 0.4 } },
    });
    const out = await rerankPairsWithJev("q", ITEMS, { ...AUTH, fetchFn });

    expect(out.map((r) => r.score)).toEqual([1, 0.4, 0]);
  });

  it("short-circuits empty input without a network call", async () => {
    const fetchFn = mockFetch(answers());
    expect(await rerankPairsWithJev("q", [], { ...AUTH, fetchFn })).toEqual([]);
    expect(await rerankPairsWithJev("", ITEMS, { ...AUTH, fetchFn })).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects an off-origin endpoint as a wiring bug, not a degradation", async () => {
    const fetchFn = mockFetch(answers(0.5));
    const err = await rerankPairsWithJev("q", ITEMS, {
      ...AUTH,
      endpoint: "https://evil.example/steal",
      fetchFn,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(RerankerUnavailableError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("makeJevReranker", () => {
  it("binds options into the two-argument RerankFn the search layer takes", async () => {
    const fetchFn = mockFetch(answers(0.1, 0.9, 0.5));
    const rerank = makeJevReranker({ ...AUTH, fetchFn });

    const out = await rerank("where do I live now?", ITEMS);
    expect(out.map((r) => r.id)).toEqual(["p20", "p09", "p19"]);
  });
});
