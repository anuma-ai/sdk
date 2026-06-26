import { describe, expect, it, vi } from "vitest";

import { callPortalJsonCompletion } from "./portalLlm.js";

function mockResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("callPortalJsonCompletion — prose-tolerant JSON extraction", () => {
  const baseArgs = {
    apiKey: "test-key",
    model: "anthropic/claude-sonnet-4-6",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
  } as const;

  it("parses a clean JSON object", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1,"b":2}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("extracts JSON wrapped in a ```json fence", async () => {
    const content = 'Sure, here it is:\n```json\n{"items":["a","b"]}\n```';
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(content));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ items: ["a", "b"] });
  });

  it("extracts JSON wrapped in a bare ``` fence", async () => {
    const content = 'Here you go:\n```\n{"k":"v"}\n```';
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(content));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ k: "v" });
  });

  it("strips a leading prose paragraph before the JSON", async () => {
    const content =
      'I have extracted the following memories from the conversation:\n\n{"items":[{"content":"hi"}]}';
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(content));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ items: [{ content: "hi" }] });
  });

  it("strips a trailing prose paragraph after the JSON", async () => {
    const content =
      '{"mode":"specific","subQueries":["q"]}\n\nLet me know if you want a different breakdown.';
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(content));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["q"] });
  });

  it("balances nested braces inside string values", async () => {
    const content = 'Here:\n{"text":"this has {nested} braces and \\"quotes\\""}';
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(content));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ text: 'this has {nested} braces and "quotes"' });
  });

  it("supports top-level arrays", async () => {
    const content = "Sure:\n[1, 2, 3]\nThat's the list.";
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(content));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns null and warns when the response is pure prose with no JSON", async () => {
    const content = "Do you want me to summarize the conversation first?";
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(content));
    // maxAttempts: 1 — this is a parsing test, not a retry test.
    const result = await callPortalJsonCompletion({ ...baseArgs, maxAttempts: 1, fetchFn });
    expect(result).toBeNull();
  });

  it("appends an assistant prefill { for anthropic models and prepends it on parse", async () => {
    // Simulate Anthropic's prefill behavior: the model continues from "{"
    // so the returned content does NOT include the opening brace.
    const fetchFn = vi
      .fn()
      .mockResolvedValue(mockResponse('"mode":"specific","subQueries":["q"]}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["q"] });

    const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    const messages = sentBody.messages as Array<{ role: string; content: string }>;
    expect(messages.at(-1)).toEqual({ role: "assistant", content: "{" });
  });

  it("avoids double-prefix when an anthropic provider echoes the prefill", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(mockResponse('{"mode":"specific","subQueries":["q"]}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ mode: "specific", subQueries: ["q"] });
  });

  it("does NOT add an assistant prefill for non-anthropic models", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      model: "openai/gpt-5.4",
      fetchFn,
    });
    const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    const messages = sentBody.messages as Array<{ role: string; content: string }>;
    expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("sends response_format: json_object for models that accept it", async () => {
    // openai/*, ling, deepseek all accept the flag (verified 2026-06), and a
    // proxied openrouter/openai/* id still matches on the `openai` segment.
    for (const model of [
      "openai/gpt-5-mini",
      "inclusionai/ling-2.6-flash",
      "deepseek/deepseek-v4-flash",
      "openrouter/openai/gpt-5-mini",
    ]) {
      const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
      await callPortalJsonCompletion({ ...baseArgs, model, fetchFn });
      const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
      expect(sentBody.response_format, model).toEqual({ type: "json_object" });
    }
  });

  it("does not match a provider name as a coincidental id substring", async () => {
    // Segment match, not substring: `someprovider-openai/x` must NOT qualify.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({ ...baseArgs, model: "someprovider-openai/x", fetchFn });
    const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sentBody.response_format).toBeUndefined();
  });

  it("omits response_format for gpt-oss (it 400s on the flag)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({ ...baseArgs, model: "gpt-oss/gpt-oss-120b", fetchFn });
    const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sentBody.response_format).toBeUndefined();
  });

  it("strips a caller-supplied response_format for a model that rejects it", async () => {
    // The `extra` escape hatch must not re-inject the flag onto a rejecter —
    // the gate has final say.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      model: "gpt-oss/gpt-oss-120b",
      extra: { response_format: { type: "json_object" } },
      fetchFn,
    });
    const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sentBody.response_format).toBeUndefined();
  });
});

describe("callPortalJsonCompletion — dual auth (apiKey / getToken)", () => {
  // No credentials — each test supplies apiKey and/or getToken.
  const noAuthArgs = {
    model: "openai/gpt-5-mini",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
  } as const;

  it("sends x-api-key when apiKey is provided", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    const result = await callPortalJsonCompletion({ ...noAuthArgs, apiKey: "key-1", fetchFn });
    expect(result).toEqual({ ok: true });
    const headers = fetchFn.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("key-1");
    expect(headers.Authorization).toBeUndefined();
  });

  it("sends Authorization: Bearer when only getToken is provided", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    const getToken = vi.fn().mockResolvedValue("tok-123");
    const result = await callPortalJsonCompletion({ ...noAuthArgs, getToken, fetchFn });
    expect(result).toEqual({ ok: true });
    expect(getToken).toHaveBeenCalledOnce();
    const headers = fetchFn.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
    expect(headers["x-api-key"]).toBeUndefined();
  });

  it("prefers apiKey when both apiKey and getToken are provided", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    const getToken = vi.fn().mockResolvedValue("tok-123");
    await callPortalJsonCompletion({ ...noAuthArgs, apiKey: "key-1", getToken, fetchFn });
    expect(getToken).not.toHaveBeenCalled();
    const headers = fetchFn.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("key-1");
    expect(headers.Authorization).toBeUndefined();
  });

  it("returns null (without fetching) when getToken yields no token", async () => {
    const fetchFn = vi.fn();
    const getToken = vi.fn().mockResolvedValue(null);
    const result = await callPortalJsonCompletion({ ...noAuthArgs, getToken, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns null (without fetching) when getToken throws", async () => {
    const fetchFn = vi.fn();
    const getToken = vi.fn().mockRejectedValue(new Error("token service down"));
    const result = await callPortalJsonCompletion({ ...noAuthArgs, getToken, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws when neither apiKey nor getToken is provided", async () => {
    const fetchFn = vi.fn();
    await expect(callPortalJsonCompletion({ ...noAuthArgs, fetchFn })).rejects.toThrow(
      "Either apiKey or getToken must be provided"
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("callPortalJsonCompletion — retry on transient failure", () => {
  // backoffMs: () => 0 so retries don't introduce real delay in tests.
  const baseArgs = {
    apiKey: "test-key",
    model: "openai/gpt-5-mini",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
    backoffMs: () => 0,
  } as const;

  it("retries an empty completion, then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse("")) // no completion content
      .mockResolvedValueOnce(mockResponse('{"ok":true}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries a no-JSON prose completion, then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse("Now output the JSON.")) // the real-world failure
      .mockResolvedValueOnce(mockResponse('{"candidates":[]}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ candidates: [] });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries a 500, then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }))
      .mockResolvedValueOnce(mockResponse('{"ok":true}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries a 400 (treated as a transient provider hiccup), then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad request", { status: 400 }))
      .mockResolvedValueOnce(mockResponse('{"ok":true}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries a thrown network error, then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(mockResponse('{"ok":true}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a terminal 401 and returns null after one call", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a terminal 404", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts and returns null", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("upstream error", { status: 503 }));
    const result = await callPortalJsonCompletion({ ...baseArgs, maxAttempts: 3, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("maxAttempts: 1 disables retries (single fetch on a transient failure)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("upstream error", { status: 500 }));
    const result = await callPortalJsonCompletion({ ...baseArgs, maxAttempts: 1, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("defaults to 3 attempts when maxAttempts is unset", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse("no json here"));
    await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("retries when the completion parses to literal null, then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse("null")) // valid JSON, but null is the failure sentinel
      .mockResolvedValueOnce(mockResponse('{"ok":true}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("re-resolves auth each attempt — a retry uses a fresh token", async () => {
    const getToken = vi.fn().mockResolvedValueOnce("tok-1").mockResolvedValueOnce("tok-2");
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }))
      .mockResolvedValueOnce(mockResponse('{"ok":true}'));
    const result = await callPortalJsonCompletion({
      model: "openai/gpt-5-mini",
      systemPrompt: "s",
      userMessage: "u",
      tag: "test",
      getToken,
      fetchFn,
      backoffMs: () => 0,
    });
    expect(result).toEqual({ ok: true });
    // Token fetched per attempt (not reused from before the backoff), so the
    // second request carries the fresh token rather than a possibly-expired one.
    expect(getToken).toHaveBeenCalledTimes(2);
    const secondHeaders = fetchFn.mock.calls[1][1].headers as Record<string, string>;
    expect(secondHeaders.Authorization).toBe("Bearer tok-2");
  });
});
