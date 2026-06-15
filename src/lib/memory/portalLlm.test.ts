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
    const result = await callPortalJsonCompletion({ ...baseArgs, fetchFn });
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
