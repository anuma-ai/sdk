import { describe, expect, it, vi } from "vitest";

import { decomposeQuery } from "./decomposeQuery";

function mockFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("decomposeQuery", () => {
  it("falls back to specific (not throws) when options carry no credentials", async () => {
    const result = await decomposeQuery("what do you know about me?", {} as never);
    expect(result.mode).toBe("specific");
  });

  it("defaults to an open-weights model (no closed provider for private recall queries)", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: JSON.stringify({ mode: "specific", subQueries: ["q"] }) } },
        ],
      }),
    }) as unknown as typeof fetch;
    await decomposeQuery("q", { apiKey: "k", fetchFn });
    const sentBody = JSON.parse(
      (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    );
    expect(sentBody.model).toBe("inclusionai/ling-2.6-flash");
  });

  it("returns specific mode for a specific query", async () => {
    const fetchFn = mockFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "specific",
              subQueries: ["What is my dog's name?"],
            }),
          },
        },
      ],
    });
    const result = await decomposeQuery("What is my dog's name?", {
      apiKey: "k",
      fetchFn,
    });
    expect(result.mode).toBe("specific");
    expect(result.subQueries).toEqual(["What is my dog's name?"]);
  });

  it("returns composite mode with sub-queries", async () => {
    const fetchFn = mockFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "composite",
              subQueries: ["q1", "q2", "q3"],
            }),
          },
        },
      ],
    });
    const result = await decomposeQuery("Tell me about the user", {
      apiKey: "k",
      fetchFn,
    });
    expect(result.mode).toBe("composite");
    expect(result.subQueries).toEqual(["q1", "q2", "q3"]);
  });

  it("falls back to specific on network error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const result = await decomposeQuery("anything", { apiKey: "k", fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["anything"] });
  });

  it("falls back on non-OK response", async () => {
    const result = await decomposeQuery("q", {
      apiKey: "k",
      fetchFn: mockFetch({}, false),
    });
    expect(result).toEqual({ mode: "specific", subQueries: ["q"] });
  });

  it("falls back on malformed JSON content", async () => {
    const fetchFn = mockFetch({
      choices: [{ message: { content: "{not json" } }],
    });
    const result = await decomposeQuery("q", { apiKey: "k", fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["q"] });
  });

  it("falls back when subQueries is missing or empty", async () => {
    const fetchFn = mockFetch({
      choices: [{ message: { content: JSON.stringify({ mode: "composite", subQueries: [] }) } }],
    });
    const result = await decomposeQuery("q", { apiKey: "k", fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["q"] });
  });

  it("caps composite sub-queries at MAX_SUB_QUERIES (5)", async () => {
    const fetchFn = mockFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "composite",
              subQueries: ["a", "b", "c", "d", "e", "f", "g"],
            }),
          },
        },
      ],
    });
    const result = await decomposeQuery("q", { apiKey: "k", fetchFn });
    expect(result.subQueries).toHaveLength(5);
    expect(result.subQueries).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("collapses specific-mode sub-queries to the original query", async () => {
    const fetchFn = mockFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "specific",
              subQueries: ["something else", "another"],
            }),
          },
        },
      ],
    });
    const result = await decomposeQuery("original", { apiKey: "k", fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["original"] });
  });

  it("trims whitespace and drops empty sub-queries", async () => {
    const fetchFn = mockFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "composite",
              subQueries: ["  q1  ", "", "   ", "q2"],
            }),
          },
        },
      ],
    });
    const result = await decomposeQuery("q", { apiKey: "k", fetchFn });
    expect(result.mode).toBe("composite");
    expect(result.subQueries).toEqual(["q1", "q2"]);
  });

  it("falls back on empty input", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const result = await decomposeQuery("   ", { apiKey: "k", fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["   "] });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
