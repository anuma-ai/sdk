import { afterEach, describe, expect, it, vi } from "vitest";

import { noopLogger, setLogger } from "../logger.js";

import { callPortalJsonCompletion } from "./portalLlm.js";
import { INTERNAL_FLOW_MARKER } from "../internalFlowMarker.js";

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

  it("marks the system prompt as a first-party internal flow", async () => {
    // Every caller of this helper is a background op. Without the marker the portal's
    // detector reads them as markerless — i.e. as a scripted abuser — and refuses
    // them once PORTAL_DETECTION_REJECT_MARKERLESS is on. Asserted on the wire
    // because the marking happens here, not in the callers.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({ ...baseArgs, model: "openai/gpt-5.4", fetchFn });

    const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    const messages = sentBody.messages as Array<{ role: string; content: string }>;
    const system = messages.find((m) => m.role === "system");
    expect(system?.content).toContain(INTERNAL_FLOW_MARKER);
    // The caller's own prompt must survive intact underneath the marker.
    expect(system?.content.endsWith(baseArgs.systemPrompt)).toBe(true);
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

describe("callPortalJsonCompletion — reasoning_effort gate", () => {
  const baseArgs = {
    apiKey: "test-key",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
  } as const;

  it("pins reasoning off for OpenAI models, direct and proxied", async () => {
    // These are fill-a-JSON-schema calls with nothing to reason about, and
    // reasoning tokens count against the completion cap — leaving effort at the
    // provider default is what truncates the response. See
    // DEFAULT_EXTRACTION_MODEL.
    for (const model of ["openai/gpt-5.6-luna", "openrouter/openai/gpt-5-mini"]) {
      const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
      await callPortalJsonCompletion({ ...baseArgs, model, fetchFn });
      const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
      expect(sentBody.reasoning_effort, model).toBe("none");
    }
  });

  it("omits reasoning_effort for non-OpenAI providers", async () => {
    // Narrow by design: a provider that doesn't document the field gets
    // nothing rather than a 400.
    for (const model of [
      "gpt-oss/gpt-oss-120b",
      "inclusionai/ling-2.6-flash",
      "anthropic/claude-sonnet-4",
      "someprovider-openai/x",
    ]) {
      const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
      await callPortalJsonCompletion({ ...baseArgs, model, fetchFn });
      const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
      expect(sentBody.reasoning_effort, model).toBeUndefined();
    }
  });

  it("lets an explicit caller override win", async () => {
    // Unlike response_format (which the gate force-deletes because a rejecting
    // model 400s), effort is a tuning knob — `extra` is merged after it.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      model: "openai/gpt-5.6-luna",
      extra: { reasoning_effort: "low" },
      fetchFn,
    });
    const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sentBody.reasoning_effort).toBe("low");
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

  it("does NOT retry a 400 (a bad request won't succeed on retry)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 and honors a Retry-After header over the fixed backoff", async () => {
    const delays: number[] = [];
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: () => void,
      ms?: number
    ) => {
      delays.push(ms ?? 0);
      fn(); // fire immediately so the test doesn't actually wait
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    try {
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(
          new Response("rate limited", { status: 429, headers: { "retry-after": "2" } })
        )
        .mockResolvedValueOnce(mockResponse('{"ok":true}'));
      // backoffMs returns 10ms; Retry-After is 2s → the 2s wins.
      const result = await callPortalJsonCompletion({ ...baseArgs, backoffMs: () => 10, fetchFn });
      expect(result).toEqual({ ok: true });
      expect(delays).toContain(2000);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it("stops retrying once the absolute totalTimeoutMs budget is spent", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("upstream error", { status: 503 }));
    // totalTimeoutMs: 0 → the budget is already spent after the first failure,
    // so it gives up without a second attempt even though maxAttempts is 3.
    const result = await callPortalJsonCompletion({
      ...baseArgs,
      maxAttempts: 3,
      totalTimeoutMs: 0,
      fetchFn,
    });
    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
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

  it("does NOT retry a 401 on the apiKey path (static key — genuine auth failure)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries a 401 on the getToken path with a refreshed token, then succeeds", async () => {
    // A 401 may just be an expired token — the next attempt re-resolves
    // getToken and sends a fresh one.
    const getToken = vi.fn().mockResolvedValueOnce("expired").mockResolvedValueOnce("fresh");
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
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
    expect(getToken).toHaveBeenCalledTimes(2);
    const secondHeaders = fetchFn.mock.calls[1][1].headers as Record<string, string>;
    expect(secondHeaders.Authorization).toBe("Bearer fresh");
  });

  it("does NOT retry unavailable auth — it's terminal, not a transient failure", async () => {
    // Locks the contract: a missing/failed token must not be hammered 3×.
    const getToken = vi.fn().mockResolvedValue(null);
    const fetchFn = vi.fn();
    const result = await callPortalJsonCompletion({
      model: "openai/gpt-5-mini",
      systemPrompt: "s",
      userMessage: "u",
      tag: "test",
      getToken,
      fetchFn,
      maxAttempts: 3,
      backoffMs: () => 0,
    });
    expect(result).toBeNull();
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(fetchFn).not.toHaveBeenCalled();
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

describe("callPortalJsonCompletion — endpointOverride", () => {
  const baseArgs = {
    apiKey: "test-key",
    baseUrl: "https://portal.test",
    model: "anthropic/claude-sonnet-4-6",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
  } as const;

  it("posts to the default /api/v1/chat/completions when no override is given", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(fetchFn.mock.calls[0][0]).toBe("https://portal.test/api/v1/chat/completions");
  });

  it("posts to the overridden path when endpointOverride is set", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      endpointOverride: "/api/v1/utility/chat/completions",
      fetchFn,
    });
    expect(fetchFn.mock.calls[0][0]).toBe("https://portal.test/api/v1/utility/chat/completions");
  });

  it("normalizes a missing leading slash onto the override path", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      endpointOverride: "api/v1/utility/chat/completions",
      fetchFn,
    });
    expect(fetchFn.mock.calls[0][0]).toBe("https://portal.test/api/v1/utility/chat/completions");
  });

  it("changes only the path — the request body is byte-identical with vs without override", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    await callPortalJsonCompletion({
      ...baseArgs,
      endpointOverride: "/api/v1/utility/chat/completions",
      fetchFn,
    });
    const bodyDefault = fetchFn.mock.calls[0][1].body as string;
    const bodyOverride = fetchFn.mock.calls[1][1].body as string;
    expect(bodyOverride).toBe(bodyDefault);
  });

  it("throws (rejects) on an empty/whitespace override before any request is sent", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await expect(
      callPortalJsonCompletion({ ...baseArgs, endpointOverride: "   ", fetchFn })
    ).rejects.toThrow(/non-empty, root-relative path/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws (rejects) on an off-origin (absolute URL) override", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await expect(
      callPortalJsonCompletion({
        ...baseArgs,
        endpointOverride: "https://evil.com/api/v1/chat/completions",
        fetchFn,
      })
    ).rejects.toThrow(/not a protocol-relative or absolute URL/);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("callPortalJsonCompletion — reported token usage", () => {
  const baseArgs = {
    apiKey: "test-key",
    model: "gpt-oss/gpt-oss-120b",
    systemPrompt: "system",
    userMessage: "user",
    tag: "memory/extract",
  } as const;

  const debug = vi.fn();
  afterEach(() => {
    debug.mockReset();
    setLogger(noopLogger); // restore a silent logger for other tests
  });

  function withSpyLogger() {
    setLogger({ debug, info: vi.fn(), warn: vi.fn(), error: vi.fn() });
  }

  /** A portal response body with arbitrary extra top-level fields. */
  function bodyResponse(body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("reports prompt, completion and portal-reported cached tokens", async () => {
    withSpyLogger();
    const fetchFn = vi.fn().mockResolvedValue(
      bodyResponse({
        choices: [{ message: { content: '{"a":1}' } }],
        usage: { prompt_tokens: 1500, completion_tokens: 40, total_tokens: 1540 },
        portal: { cached_tokens: 1328 },
      })
    );
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ a: 1 });
    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug.mock.calls[0][0]).toBe(
      "[memory/extract] usage prompt=1500 completion=40 cached=1328"
    );
  });

  it("reports cached=0 when the portal omits the field — that IS the no-cache-hit signal", async () => {
    withSpyLogger();
    const fetchFn = vi.fn().mockResolvedValue(
      bodyResponse({
        choices: [{ message: { content: '{"a":1}' } }],
        usage: { prompt_tokens: 1500, completion_tokens: 40 },
      })
    );
    await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(debug.mock.calls[0][0]).toBe(
      "[memory/extract] usage prompt=1500 completion=40 cached=0"
    );
  });

  it("falls back to the OpenAI-standard prompt_tokens_details.cached_tokens", async () => {
    withSpyLogger();
    const fetchFn = vi.fn().mockResolvedValue(
      bodyResponse({
        choices: [{ message: { content: '{"a":1}' } }],
        usage: {
          prompt_tokens: 1500,
          completion_tokens: 40,
          prompt_tokens_details: { cached_tokens: 1024 },
        },
      })
    );
    await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(debug.mock.calls[0][0]).toBe(
      "[memory/extract] usage prompt=1500 completion=40 cached=1024"
    );
  });

  it("logs nothing when the response carries no usage at all", async () => {
    withSpyLogger();
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ a: 1 });
    expect(debug).not.toHaveBeenCalled();
  });

  it("survives a malformed usage object without failing the call", async () => {
    withSpyLogger();
    const fetchFn = vi.fn().mockResolvedValue(
      bodyResponse({
        choices: [{ message: { content: '{"a":1}' } }],
        usage: "not-an-object",
        portal: 12,
      })
    );
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(result).toEqual({ a: 1 });
    expect(debug).not.toHaveBeenCalled();
  });

  it("does not let a throwing logger discard a successful completion", async () => {
    // setLogger takes an arbitrary consumer object, so debug can throw. This
    // one runs on the success path of every memory LLM call, ahead of the
    // completion parse, so an unguarded throw wouldn't just lose a log line —
    // it would fail an extraction that actually worked.
    const throwing = vi.fn(() => {
      throw new Error("logger backend is down");
    });
    setLogger({ debug: throwing, info: vi.fn(), warn: vi.fn(), error: vi.fn() });
    const fetchFn = vi.fn().mockResolvedValue(
      bodyResponse({
        choices: [{ message: { content: '{"a":1}' } }],
        usage: { prompt_tokens: 1500, completion_tokens: 40 },
      })
    );

    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });

    expect(result).toEqual({ a: 1 });
    expect(throwing).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1); // not retried as a failure
  });

  it("still reports usage when the completion came back empty", async () => {
    // An empty completion is retried, but the prompt tokens were spent either
    // way — this is exactly the case where knowing whether the prefix was
    // cached is worth something.
    withSpyLogger();
    const fetchFn = vi.fn().mockResolvedValue(
      bodyResponse({
        choices: [{ message: { content: "" } }],
        usage: { prompt_tokens: 1500, completion_tokens: 0 },
        portal: { cached_tokens: 1328 },
      })
    );
    const result = await callPortalJsonCompletion({ ...baseArgs, maxAttempts: 1, fetchFn });
    expect(result).toBeNull();
    expect(debug.mock.calls[0][0]).toBe(
      "[memory/extract] usage prompt=1500 completion=0 cached=1328"
    );
  });
});

describe("callPortalJsonCompletion — X-Anuma-Task-Type", () => {
  const baseArgs = {
    apiKey: "test-key",
    model: "anthropic/claude-sonnet-4-6",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
  } as const;

  afterEach(() => {
    setLogger(noopLogger);
  });

  function headersOf(fetchFn: ReturnType<typeof vi.fn>): Record<string, string> {
    return (fetchFn.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
  }

  it("sends the declared task type so the portal can own the prompt for it", async () => {
    setLogger(noopLogger);
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await callPortalJsonCompletion({ ...baseArgs, taskType: "memory_extract", fetchFn });
    expect(headersOf(fetchFn)["X-Anuma-Task-Type"]).toBe("memory_extract");
  });

  it("omits the header entirely when no task is declared", async () => {
    setLogger(noopLogger);
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await callPortalJsonCompletion({ ...baseArgs, fetchFn });
    expect(headersOf(fetchFn)).not.toHaveProperty("X-Anuma-Task-Type");
  });

  it("keeps auth and content-type intact alongside it", async () => {
    setLogger(noopLogger);
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"a":1}'));
    await callPortalJsonCompletion({ ...baseArgs, taskType: "memory_topic", fetchFn });
    expect(headersOf(fetchFn)).toMatchObject({
      "x-api-key": "test-key",
      "Content-Type": "application/json",
      "X-Anuma-Task-Type": "memory_topic",
    });
  });
});

describe("callPortalJsonCompletion — JSON contract reinforcement on retry (#911)", () => {
  const baseArgs = {
    apiKey: "test-key",
    // Deliberately NOT anthropic: that path gets the `{` assistant prefill, which
    // is a different recovery mechanism. This is the production extraction model,
    // which is in neither RESPONSE_FORMAT_OK nor the prefill path — so the
    // reminder is the only structural help it gets.
    model: "gpt-oss/gpt-oss-120b",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
    backoffMs: () => 0,
  } as const;

  /** System-message contents of the Nth fetch call, in order. */
  function systemsOf(fetchFn: ReturnType<typeof vi.fn>, callIndex: number): string[] {
    const body = JSON.parse(fetchFn.mock.calls[callIndex][1].body as string) as {
      messages: { role: string; content: string }[];
    };
    return body.messages.filter((m) => m.role === "system").map((m) => m.content);
  }

  it("does not send the reminder on the first attempt", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":1}'));
    await callPortalJsonCompletion({ ...baseArgs, fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(systemsOf(fetchFn, 0)).toHaveLength(1);
  });

  it("adds the reminder to the attempt AFTER a prose answer", async () => {
    // The whole point: attempt 2 must differ from attempt 1. A byte-identical
    // retry re-asks a model that already answered with prose.
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse("Sure! Here's what I found:"))
      .mockResolvedValueOnce(mockResponse('{"ok":1}'));

    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });

    expect(result).toEqual({ ok: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(systemsOf(fetchFn, 0)).toHaveLength(1);
    const retrySystems = systemsOf(fetchFn, 1);
    expect(retrySystems).toHaveLength(2);
    expect(retrySystems[1]).toContain("Output ONLY the strict JSON object");
  });

  it("leaves the marked system prompt byte-identical across attempts", async () => {
    // The portal's internal-flow detector reads the FIRST system message. The
    // reminder is a separate message specifically so a retry cannot change what
    // the detector sees — that would turn a parse failure into an auth problem.
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse("nope"))
      .mockResolvedValueOnce(mockResponse('{"ok":1}'));

    await callPortalJsonCompletion({ ...baseArgs, fetchFn });

    expect(systemsOf(fetchFn, 0)[0]).toBe(systemsOf(fetchFn, 1)[0]);
    expect(systemsOf(fetchFn, 1)[0]).toContain(INTERNAL_FLOW_MARKER);
  });

  it("stays on for every later attempt once a parse has failed", async () => {
    // Sticky: a model whose instructions did not land the first time is not
    // helped by dropping the reminder on attempt 3.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse("still prose"));

    await callPortalJsonCompletion({ ...baseArgs, fetchFn, maxAttempts: 3 });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(systemsOf(fetchFn, 0)).toHaveLength(1);
    expect(systemsOf(fetchFn, 1)).toHaveLength(2);
    expect(systemsOf(fetchFn, 2)).toHaveLength(2);
  });

  it("does NOT reinforce after a network failure", async () => {
    // A transport error says nothing about the request's shape, so the reminder
    // would be prompt noise for a problem it cannot fix.
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValueOnce(mockResponse('{"ok":1}'));

    await callPortalJsonCompletion({ ...baseArgs, fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(systemsOf(fetchFn, 1)).toHaveLength(1);
  });

  it("does NOT reinforce after a retryable HTTP status", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream boom", { status: 503 }))
      .mockResolvedValueOnce(mockResponse('{"ok":1}'));

    await callPortalJsonCompletion({ ...baseArgs, fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(systemsOf(fetchFn, 1)).toHaveLength(1);
  });
});

// ── Responses transport ──────────────────────────────────────────────────────
// The transport exists so a reasoning model can actually reason: /chat/completions
// rejects the gpt-5.6 family with an explicit reasoning_effort, and ai-portal's
// neutralizeChatReasoningEffort rewrites any effort the caller did send to "none".
// It takes a ChatCompletionRequest and has no Responses-API counterpart.

/** A Responses-API body: `output` interleaves reasoning and message items. */
function mockResponsesBody(
  text: string,
  opts: { withReasoningItem?: boolean; outputText?: boolean } = {}
): Response {
  const body: Record<string, unknown> = opts.outputText
    ? { output_text: text }
    : {
        output: [
          ...(opts.withReasoningItem ? [{ id: "rs_1", type: "reasoning", summary: [] }] : []),
          { id: "msg_1", type: "message", content: [{ type: "output_text", text }] },
        ],
      };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("callPortalJsonCompletion — responses transport", () => {
  const baseArgs = {
    apiKey: "test-key",
    model: "openai/gpt-5.6-luna",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
  } as const;

  it("posts a Responses-shaped body to the responses endpoint", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    const out = await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      reasoning: { effort: "medium" },
      fetchFn,
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain("/api/v1/responses");
    const sent = JSON.parse(init.body as string);
    // Roles and order, not exact text: the system prompt carries the internal
    // first-party flow marker that every portal call gets.
    expect(
      sent.input.map((m: { role: string }) => m.role),
      "Responses takes `input`, not `messages`"
    ).toEqual(["system", "user"]);
    expect(sent.input[0].content).toContain("system");
    expect(sent.input[1].content).toBe("user");
    expect(sent.messages).toBeUndefined();
    expect(sent.reasoning).toEqual({ effort: "medium" });
    expect(out).toEqual({ ok: true });
  });

  it("does not send response_format on this transport", async () => {
    // The Responses API spells structured output differently (`text.format`) and
    // that is unverified against the portal — sending the chat field would be a
    // guess. Parsing leans on the strict-JSON prompt + extractJsonCandidate,
    // exactly as it already does for every response_format-rejecting model.
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({ ...baseArgs, transport: "responses", fetchFn });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sent.response_format).toBeUndefined();
    expect(sent.text).toBeUndefined();
  });

  it("reads text past a leading reasoning item", async () => {
    // THE bug this walk exists to prevent. `output` interleaves reasoning and
    // message items; taking output[0] returns the reasoning entry, which carries
    // no text — so a reasoning model would report an empty completion and burn
    // all three retries on exactly the calls this transport was built for.
    const fetchFn = vi
      .fn()
      .mockResolvedValue(mockResponsesBody('{"facts":[1]}', { withReasoningItem: true }));
    const out = await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      reasoning: { effort: "low" },
      fetchFn,
    });
    expect(out).toEqual({ facts: [1] });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("prefers output_text when the portal provides it", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":1}', { outputText: true }));
    expect(
      await callPortalJsonCompletion({ ...baseArgs, transport: "responses", fetchFn })
    ).toEqual({ ok: 1 });
  });

  it("defaults to the chat transport and leaves it byte-identical", async () => {
    // Every existing caller must be unaffected by the branch.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({ ...baseArgs, model: "openai/gpt-5-mini", fetchFn });
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain("/api/v1/chat/completions");
    const sent = JSON.parse(init.body as string);
    expect(sent.messages).toHaveLength(2);
    expect(sent.input).toBeUndefined();
    expect(sent.response_format).toEqual({ type: "json_object" });
  });

  it("still honours an endpointOverride on the responses transport", async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      endpointOverride: "/api/v1/utility/responses",
      fetchFn,
    });
    expect(String(fetchFn.mock.calls[0][0])).toContain("/api/v1/utility/responses");
  });

  it("retries an empty responses answer rather than accepting it", async () => {
    // An `output` array with no message text is a real empty answer from this
    // transport, so it must reach the empty-completion retry — not fall through
    // to the chat parse and surface as a wrong-shape null.
    const empty = () =>
      new Response(JSON.stringify({ output: [{ id: "rs_1", type: "reasoning" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(empty())
      .mockResolvedValue(mockResponsesBody('{"ok":true}'));
    const out = await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      fetchFn,
      backoffMs: () => 1,
    });
    expect(out).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("callPortalJsonCompletion — responses transport misuse guards", () => {
  const baseArgs = {
    apiKey: "test-key",
    model: "openai/gpt-5.6-luna",
    systemPrompt: "system",
    userMessage: "user",
    tag: "test",
  } as const;

  it("translates the chat-spelled output cap that topicExtract passes", async () => {
    // `extra` is a passthrough and everything in it today is chat-spelled,
    // because until now chat was the only transport. topicExtract sends
    // `max_completion_tokens: 8192` and is the first lane pointed here; the
    // Responses API reads `max_output_tokens`. Spreading it verbatim would post
    // a field the endpoint ignores, silently drop the cap to the portal's 4096
    // default, and reproduce the truncate-mid-JSON-and-lose-the-batch failure
    // topicExtract's own comment documents — silently, since a typed Go
    // ResponseRequest discards the unknown field rather than 400ing.
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      extra: { max_completion_tokens: 8192 },
      fetchFn,
    });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sent.max_output_tokens).toBe(8192);
    expect(sent.max_completion_tokens, "the chat spelling must not survive").toBeUndefined();
  });

  it("passes unknown extra keys through untranslated", async () => {
    // The map must not become a silent allowlist that swallows a field a caller
    // needs — only known chat-only spellings are rewritten.
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      extra: { metadata: { lane: "topic" } },
      fetchFn,
    });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sent.metadata).toEqual({ lane: "topic" });
  });

  it("strips a caller-supplied response_format on the responses branch", async () => {
    // The branch comment promises it never sends response_format. Before this
    // guard the `delete` was chat-only, so `extra` walked straight past the
    // promise — the asymmetry greptile and the human review both landed on.
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      extra: { response_format: { type: "json_object" } },
      fetchFn,
    });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sent.response_format).toBeUndefined();
  });

  it("throws when an endpointOverride contradicts the transport", async () => {
    // The override wins outright, so a responses body would be POSTed at a chat
    // path: accepted at the portal edge, 400'd by the provider, classified
    // http-terminal, no retry, one silent null. The app sets that override in
    // another repo (#5536), so whoever flips a lane here cannot see it.
    const fetchFn = vi.fn();
    await expect(
      callPortalJsonCompletion({
        ...baseArgs,
        transport: "responses",
        endpointOverride: "/api/v1/utility/chat/completions",
        fetchFn,
      })
    ).rejects.toThrow(/is the other transport's endpoint, but transport is "responses"/);
    expect(fetchFn, "must fail before any request is sent").not.toHaveBeenCalled();
  });

  it("throws for the mirror mismatch on the chat transport", async () => {
    const fetchFn = vi.fn();
    await expect(
      callPortalJsonCompletion({
        ...baseArgs,
        endpointOverride: "/api/v1/utility/responses",
        fetchFn,
      })
    ).rejects.toThrow(/is the other transport's endpoint, but transport is "chat"/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("accepts the matching utility override on each transport", async () => {
    const responsesFetch = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      endpointOverride: "/api/v1/utility/responses",
      fetchFn: responsesFetch,
    });
    expect(String(responsesFetch.mock.calls[0][0])).toContain("/api/v1/utility/responses");

    const chatFetch = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      endpointOverride: "/api/v1/utility/chat/completions",
      fetchFn: chatFetch,
    });
    expect(String(chatFetch.mock.calls[0][0])).toContain("/api/v1/utility/chat/completions");
  });

  it("does not carry the Anthropic prefill into `input`", async () => {
    // The prefill is a chat-completions trick. It was being carried because
    // `messages` has it pushed on before the branch — and the response-side
    // continuation-restore keys off the MODEL, not the transport, so leaving it
    // would arm a prefill-restore on a path with no prefill semantics.
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      model: "anthropic/claude-sonnet-5",
      transport: "responses",
      fetchFn,
    });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sent.input.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
  });

  it("leaves a neutral proxy path alone — the guard rejects only the wrong endpoint", async () => {
    // The first version required the transport's OWN suffix, which also threw on
    // chat overrides that were legal before this PR existed. A consumer proxying
    // through something that ends in neither has a good reason to, and breaking
    // that is not what this guard is for.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('{"ok":true}'));
    await callPortalJsonCompletion({ ...baseArgs, endpointOverride: "/api/llm-proxy", fetchFn });
    expect(String(fetchFn.mock.calls[0][0])).toContain("/api/llm-proxy");
  });

  it("does not let key order decide when both cap spellings are passed", async () => {
    // The already-correct Responses name wins; the translated chat one must never
    // overwrite it, whichever way Object.entries happens to iterate.
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('{"ok":true}'));
    await callPortalJsonCompletion({
      ...baseArgs,
      transport: "responses",
      extra: { max_completion_tokens: 1024, max_output_tokens: 8192 },
      fetchFn,
    });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body as string);
    expect(sent.max_output_tokens).toBe(8192);
    expect(sent.max_completion_tokens).toBeUndefined();
  });

  it("disarms the prefill RESTORE on the responses transport, not just the push", async () => {
    // The half that stayed open when the fix only sliced the request side.
    // `looksLikeContinuation` fires on a `"`-leading answer and glues `{` onto
    // the front — correct on chat, where we sent the prefill and the model
    // continued from it; wrong here, where nothing was ever sent, so the content
    // never lost a brace. A bare JSON string is the discriminator: armed, it
    // becomes `{"hello"` and dies through three retries to null; disarmed, it
    // parses as itself.
    const fetchFn = vi.fn().mockResolvedValue(mockResponsesBody('"hello"'));
    const out = await callPortalJsonCompletion({
      ...baseArgs,
      model: "anthropic/claude-sonnet-5",
      transport: "responses",
      fetchFn,
    });
    expect(out).toBe("hello");
    expect(fetchFn, "must not have retried").toHaveBeenCalledTimes(1);
  });

  it("keeps the prefill restore on the chat transport", async () => {
    // The control: gating on transport must not disturb the chat behaviour the
    // prefill exists for. Anthropic continues FROM the `{` we sent, so the
    // response legitimately starts mid-object and needs it prepended back.
    const fetchFn = vi.fn().mockResolvedValue(mockResponse('"a": 1}'));
    const out = await callPortalJsonCompletion({
      ...baseArgs,
      model: "anthropic/claude-sonnet-5",
      fetchFn,
    });
    expect(out).toEqual({ a: 1 });
  });

  it("falls through to the output[] walk when output_text is present but empty", async () => {
    // A Go `string` without `omitempty` marshals to "" when unset, so a
    // deployment serializing the field unconditionally would short-circuit every
    // response on it. The walk below is where a reasoning model's text lives —
    // short-circuiting reads it as empty and burns three retries to null.
    const body = new Response(
      JSON.stringify({
        output_text: "",
        output: [
          { id: "rs_1", type: "reasoning" },
          { id: "msg_1", type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    const fetchFn = vi.fn().mockResolvedValue(body);
    const out = await callPortalJsonCompletion({ ...baseArgs, transport: "responses", fetchFn });
    expect(out).toEqual({ ok: true });
    expect(fetchFn, "must not have retried").toHaveBeenCalledTimes(1);
  });
});
