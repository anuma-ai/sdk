import { afterEach, describe, expect, it, vi } from "vitest";

import { createSseClient } from "../../client/core/serverSentEvents.gen";
import { resumeStream } from "./resumeStream";
import { runToolLoop, type StreamingTransport } from "./toolLoop";

const textChunk = { type: "response.output_text.delta", delta: { OfString: "partial" } };
const toolChunk = {
  type: "response.output_item.added",
  item: { type: "function_call", id: "call", call_id: "call", name: "echo", arguments: "{}" },
};

function openResponse() {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(textChunk)}\n\n`));
    },
    cancel,
  });
  return { response: new Response(body, { headers: { "X-Inference-ID": "inf" } }), cancel };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("SSE reader cancellation", () => {
  it.each(["before the request", "before the reader"])("reports an abort %s", async (phase) => {
    const caller = new AbortController();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }));
    const fetch = vi.fn(() => {
      caller.abort();
      return Promise.resolve(response);
    });
    const onSseError = vi.fn();
    if (phase === "before the request") caller.abort();
    const { stream } = createSseClient({
      url: "https://portal.example/stream",
      signal: caller.signal,
      fetch,
      onSseError,
      sseMaxRetryAttempts: 1,
    });

    await expect(stream.next()).rejects.toMatchObject({ name: "AbortError" });
    expect(onSseError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: "AbortError" })
    );
    if (phase === "before the request") expect(fetch).not.toHaveBeenCalled();
    else await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce());
  });

  it.each([undefined, 1])("reports AbortError with retry limit %s", async (sseMaxRetryAttempts) => {
    const caller = new AbortController();
    const { response, cancel } = openResponse();
    const onSseError = vi.fn();
    const sseSleepFn = vi.fn(() => Promise.resolve());
    const fetch = vi.fn(() => Promise.resolve(response));
    const { stream } = createSseClient({
      url: "https://portal.example/stream",
      signal: caller.signal,
      fetch,
      onSseError,
      sseMaxRetryAttempts,
      sseSleepFn,
    });

    expect((await stream.next()).value).toEqual(textChunk);
    const next = stream.next();
    const rejected = expect(next).rejects.toMatchObject({ name: "AbortError" });
    caller.abort("stop");

    await rejected;
    expect(onSseError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: "AbortError" })
    );
    expect(fetch).toHaveBeenCalledOnce();
    expect(sseSleepFn).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce());
  });
});

describe.each(["fetch", "custom"] as const)("%s stream cancellation", (source) => {
  it.each([
    ["replay", "abort"],
    ["initial", "abort"],
    ["initial", "detach"],
    ["continuation", "abort"],
    ["continuation", "detach"],
    ["replay", "timeout"],
  ] as const)("interrupts the %s stream on %s", async (phase, action) => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const detach = new AbortController();
    const onFinish = vi.fn();
    const onError = vi.fn();
    const onData = vi.fn();
    const { response, cancel } = openResponse();
    const fetch = vi.fn().mockResolvedValue(response);
    if (phase === "continuation") {
      fetch.mockResolvedValueOnce(
        new Response(`data: ${JSON.stringify(toolChunk)}\n\ndata: [DONE]\n\n`)
      );
    }
    vi.stubGlobal("fetch", fetch);
    let requests = 0;
    const transport: StreamingTransport = (request) => {
      request.onStreamMeta?.({ inferenceId: "inf" });
      const toolRequest = phase === "continuation" && requests++ === 0;
      return {
        stream: (async function* () {
          if (toolRequest) {
            yield toolChunk;
            return;
          }
          yield textChunk;
          await new Promise<void>((resolve) => {
            if (request.signal?.aborted) resolve();
            else request.signal?.addEventListener("abort", () => resolve(), { once: true });
          });
        })(),
      };
    };
    const shared = {
      token: "token",
      signal: caller.signal,
      smoothing: false as const,
      idleTimeoutMs: action === "timeout" ? 100 : 0,
      onFinish,
      onError,
      onData,
      ...(source === "custom" ? { transport } : {}),
    };
    const promise =
      phase === "replay"
        ? resumeStream({ ...shared, handle: { inferenceId: "inf", apiType: "responses" } })
        : runToolLoop({
            ...shared,
            apiType: "responses",
            model: "test-model",
            messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
            detachSignal: detach.signal,
            resumable: true,
            tools: [
              {
                type: "function",
                function: { name: "echo" },
                executor: () => Promise.resolve({ ok: true }),
              },
            ],
          });

    await vi.advanceTimersByTimeAsync(0);
    expect(onData).toHaveBeenCalledExactlyOnceWith("partial");
    if (action === "timeout") await vi.advanceTimersByTimeAsync(100);
    else if (action === "detach") detach.abort();
    else caller.abort();
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result.error).toBe(
      action === "timeout"
        ? "Resume timed out"
        : action === "detach"
          ? "Request detached"
          : phase === "replay"
            ? "Resume aborted"
            : "Request aborted"
    );
    expect(JSON.stringify(result.data)).toContain("partial");
    if (phase === "replay") expect(result).toHaveProperty("interrupted", true);
    if (action === "detach") {
      expect(result).toHaveProperty("detached", true);
      expect(result).toHaveProperty("resume", {
        inferenceId: "inf",
        apiType: "responses",
        model: "test-model",
      });
    }
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    if (source === "fetch") {
      expect(cancel).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledTimes(phase === "continuation" ? 2 : 1);
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe.each(["replay", "initial"] as const)("%s completion", (phase) => {
  it.each([
    ["responses", { type: "response.completed", response: {} }],
    ["responses", { type: "response.incomplete", response: {} }],
    ["responses", "[DONE]"],
    ["completions", { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }],
  ] as const)("preserves a terminal %s response on a late abort: %j", async (apiType, terminal) => {
    const caller = new AbortController();
    const onFinish = vi.fn();
    const transport: StreamingTransport = () => ({
      stream: (async function* () {
        yield Promise.resolve(
          apiType === "responses"
            ? textChunk
            : { choices: [{ index: 0, delta: { content: "partial" } }] }
        );
        yield terminal;
        caller.abort();
      })(),
    });
    const shared = {
      token: "token",
      signal: caller.signal,
      smoothing: false as const,
      transport,
      onFinish,
    };
    const result =
      phase === "replay"
        ? await resumeStream({ ...shared, handle: { inferenceId: "inf", apiType } })
        : await runToolLoop({
            ...shared,
            apiType,
            model: "test-model",
            messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          });

    expect(result.error).toBeNull();
    expect(JSON.stringify(result.data)).toContain("partial");
    expect(onFinish).toHaveBeenCalledOnce();
  });
});

describe.each(["replay", "initial", "continuation"] as const)("fetch %s completion", (phase) => {
  it.each([{ type: "response.completed", response: {} }, "[DONE]"])(
    "preserves a terminal response on an abort before the connection closes: %j",
    async (terminal) => {
      vi.useFakeTimers();
      const caller = new AbortController();
      const onFinish = vi.fn();
      const onError = vi.fn();
      const cancel = vi.fn();
      const event = (data: unknown) =>
        `data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(event(textChunk) + event(terminal)));
        },
        cancel,
      });
      const fetch = vi.fn().mockResolvedValue(new Response(body));
      if (phase === "continuation") {
        fetch.mockResolvedValueOnce(new Response(event(toolChunk) + event("[DONE]")));
      }
      vi.stubGlobal("fetch", fetch);
      const shared = {
        token: "token",
        signal: caller.signal,
        smoothing: false as const,
        idleTimeoutMs: 0,
        onFinish,
        onError,
      };
      const promise =
        phase === "replay"
          ? resumeStream({ ...shared, handle: { inferenceId: "inf", apiType: "responses" } })
          : runToolLoop({
              ...shared,
              apiType: "responses",
              model: "test-model",
              messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
              tools: [
                {
                  type: "function",
                  function: { name: "echo" },
                  executor: () => Promise.resolve({ ok: true }),
                },
              ],
            });

      await vi.advanceTimersByTimeAsync(0);
      caller.abort();
      await vi.advanceTimersByTimeAsync(0);

      const result = await promise;
      expect(result.error).toBeNull();
      expect(JSON.stringify(result.data)).toContain("partial");
      expect(onFinish).toHaveBeenCalledOnce();
      expect(onError).not.toHaveBeenCalled();
      expect(cancel).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledTimes(phase === "continuation" ? 2 : 1);
    }
  );
});
