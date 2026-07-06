import { describe, expect, it, vi } from "vitest";

import { consolidateMemory } from "./consolidate";

function mockFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const choices = (jsonContent: unknown) => ({
  choices: [{ message: { content: JSON.stringify(jsonContent) } }],
});

describe("consolidateMemory", () => {
  const candidates = [
    { id: "m1", content: "User has a dog named Mochi.", similarity: 0.78 },
    { id: "m2", content: "User exchanged boots at Zara on 2026-02-05.", similarity: 0.72 },
  ];

  it("returns create when LLM says create", async () => {
    const fetchFn = mockFetch(
      choices({ action: "create", content: "User likes raspberry sorbet." })
    );
    const result = await consolidateMemory("User likes raspberry sorbet.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({ action: "create", content: "User likes raspberry sorbet." });
  });

  it("returns update with consolidated content when LLM says update", async () => {
    const fetchFn = mockFetch(
      choices({
        action: "update",
        targetId: "m2",
        content: "User exchanged boots at Zara on 2026-02-05 and is awaiting the replacement pair.",
      })
    );
    const result = await consolidateMemory(
      "User has a pair of boots at Zara that they swapped earlier.",
      candidates,
      { apiKey: "k", fetchFn }
    );
    expect(result.action).toBe("update");
    expect(result.targetId).toBe("m2");
    expect(result.content).toContain("Zara");
  });

  it("returns noop with targetId when LLM says noop", async () => {
    const fetchFn = mockFetch(choices({ action: "noop", targetId: "m1" }));
    const result = await consolidateMemory("User has a dog Mochi.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({ action: "noop", targetId: "m1" });
  });

  it("falls back to create when targetId references a memory not in candidates", async () => {
    const fetchFn = mockFetch(choices({ action: "update", targetId: "m99", content: "x" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("falls back to create when no candidates — a short-circuit, not a degraded fallback", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const onFallback = vi.fn();
    const result = await consolidateMemory("new fact", [], { apiKey: "k", fetchFn, onFallback });
    expect(result).toEqual({ action: "create", content: "new fact" });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("falls back to create on empty content — a short-circuit, not a degraded fallback", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const onFallback = vi.fn();
    const result = await consolidateMemory("   ", candidates, { apiKey: "k", fetchFn, onFallback });
    expect(result).toEqual({ action: "create", content: "   " });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("retries a transient network error to the default cap, then degrades to create", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    // backoffMs: () => 0 — instant retries so the test doesn't wait the real
    // exponential schedule across the 3-attempt budget.
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      backoffMs: () => 0,
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    // A network error is transient — consolidate now retries (DEFAULT_CONSOLIDATE_ATTEMPTS = 3)
    // before degrading, so a one-off blip doesn't leave a permanent below-floor paraphrase.
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("honors a maxAttempts: 1 override (no retry, degrade on first failure)", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      maxAttempts: 1,
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a schema violation (parses fine but invalid → degrades on first attempt)", async () => {
    // A well-formed-but-wrong-schema response parses fine, so it's NOT a portal
    // retryable — validate() rejects it post-parse and it degrades immediately,
    // even though maxAttempts defaults to 3.
    const fetchFn = mockFetch(choices({ action: "update", targetId: "nope", content: "x" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result.fallbackReason).toBe("invalid_response");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("falls back on non-OK response", async () => {
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn: mockFetch({}, false),
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
  });

  it("falls back on malformed JSON", async () => {
    const fetchFn = mockFetch({
      choices: [{ message: { content: "{not json" } }],
    });
    // Unparseable JSON is transient → retried; () => 0 keeps the test instant.
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      backoffMs: () => 0,
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
  });

  it("falls back on invalid action enum", async () => {
    const fetchFn = mockFetch(choices({ action: "delete", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("falls back on update without content", async () => {
    const fetchFn = mockFetch(choices({ action: "update", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("degrades (not throws) when options carry no credentials — retain must survive misconfig", async () => {
    const onFallback = vi.fn();
    const result = await consolidateMemory("new fact", candidates, {
      onFallback,
    } as never);
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    expect(onFallback).toHaveBeenCalledWith("llm_error");
  });

  it("notifies onFallback with llm_error on LLM failure", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const onFallback = vi.fn();
    await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      onFallback,
      backoffMs: () => 0,
    });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith("llm_error");
  });

  it("notifies onFallback with invalid_response on schema violation", async () => {
    const fetchFn = mockFetch(choices({ action: "delete" }));
    const onFallback = vi.fn();
    await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn, onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith("invalid_response");
  });

  it("a throwing onFallback cannot break the write path", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const onFallback = vi.fn(() => {
      throw new Error("metrics sink exploded");
    });
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      onFallback,
      backoffMs: () => 0,
    });
    // The degraded fallback still comes back — the observability hook's
    // failure is swallowed rather than failing the retain write.
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("does not notify onFallback for a real LLM decision", async () => {
    const fetchFn = mockFetch(choices({ action: "noop", targetId: "m1" }));
    const onFallback = vi.fn();
    const result = await consolidateMemory("dup fact", candidates, {
      apiKey: "k",
      fetchFn,
      onFallback,
    });
    expect(result).toEqual({ action: "noop", targetId: "m1" });
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("uses LLM-empty content fallback for create", async () => {
    const fetchFn = mockFetch(choices({ action: "create", content: "" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });
});

describe("consolidateMemory — PII redaction", () => {
  /** Fetch mock that records request bodies and returns the given decision JSON. */
  function capturingFetch(decision: unknown): { fetchFn: typeof fetch; bodies: string[] } {
    const bodies: string[] = [];
    const fetchFn = vi.fn().mockImplementation((_url: string, init?: { body?: unknown }) => {
      bodies.push(typeof init?.body === "string" ? init.body : "");
      return Promise.resolve({ ok: true, json: async () => choices(decision) });
    }) as unknown as typeof fetch;
    return { fetchFn, bodies };
  }

  const piiCandidates = [
    { id: "m1", content: "User's email is jane@example.com.", similarity: 0.8 },
  ];

  it("redacts the new fact and candidates before the consolidation model sees them", async () => {
    const { fetchFn, bodies } = capturingFetch({ action: "noop", targetId: "m1" });
    await consolidateMemory("Email jane@example.com again", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    const sent = bodies.join("");
    expect(sent).not.toContain("jane@example.com");
    expect(sent).toContain("[EMAIL_1]");
  });

  it("de-anonymizes the consolidated content the model returns", async () => {
    // The model reasons over placeholders and echoes one back in its content.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's email is [EMAIL_1].",
    });
    const result = await consolidateMemory("Reach me at jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result.action).toBe("update");
    expect(result.content).toBe("User's email is jane@example.com.");
  });

  it("leaves inputs raw when redaction is disabled (default)", async () => {
    const { fetchFn, bodies } = capturingFetch({ action: "noop", targetId: "m1" });
    await consolidateMemory("Email jane@example.com again", piiCandidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(bodies.join("")).toContain("jane@example.com");
  });

  it("degrades to create when the consolidated content has a hallucinated placeholder", async () => {
    // Only [EMAIL_1] is assigned (jane@example.com); the model emits an update
    // referencing [EMAIL_2], which has no mapping. Rather than overwrite the
    // existing memory with a literal "[EMAIL_2]", degrade to create.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's email is [EMAIL_2].",
    });
    const result = await consolidateMemory("Reach jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result).toEqual({
      action: "create",
      content: "Reach jane@example.com",
      fallbackReason: "invalid_response",
    });
  });

  it("de-anonymizes a BRACKET-DROPPED echo in the consolidated content", async () => {
    // The consolidation model echoes "[EMAIL_1]" back as bare "EMAIL_1"; the
    // storage-path loose restore must still recover the real value so the vault
    // never stores the opaque token.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's email is EMAIL_1.",
    });
    const result = await consolidateMemory("Reach me at jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result.action).toBe("update");
    expect(result.content).toBe("User's email is jane@example.com.");
  });

  it("degrades to create when the consolidated content has a BRACKET-DROPPED hallucinated placeholder", async () => {
    // Bare, never-assigned "EMAIL_2" — the loose guard must catch it so a bogus
    // token never overwrites the existing memory.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's backup email is EMAIL_2.",
    });
    const result = await consolidateMemory("Reach jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result).toEqual({
      action: "create",
      content: "Reach jane@example.com",
      fallbackReason: "invalid_response",
    });
  });
});
