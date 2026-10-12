import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import * as sseModule from "../client/core/serverSentEvents.gen";

type SendMessageResult = Awaited<ReturnType<ReturnType<typeof useChat>["sendMessage"]>>;

vi.mock("../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return {
    ...orig,
    createSseClient: vi.fn(),
  };
});

const mockCreateSseClient = vi.mocked(sseModule.createSseClient);

describe("useChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send message and handle stream response", async () => {
    mockCreateSseClient.mockReturnValue({
      stream: (async function* () {
        yield {
          type: "response.created",
          response: {
            id: "resp-123",
            model: "fireworks/accounts/fireworks/models/kimi-k2p5",
          },
        };
        yield {
          type: "response.output_text.delta",
          delta: { OfString: "Hello" },
        };
        yield {
          type: "response.output_text.delta",
          delta: { OfString: " world" },
        };
        yield {
          type: "response.completed",
          response: {
            usage: {
              input_tokens: 10,
              output_tokens: 5,
            },
          },
        };
      })(),
    } as any);

    const { result } = renderHook(() =>
      useChat({
        getToken: async () => "fake-token",
      })
    );

    let response: SendMessageResult | undefined;

    await act(async () => {
      response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        model: "fireworks/accounts/fireworks/models/kimi-k2p5",
      });
    });

    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
    const callOpts = mockCreateSseClient.mock.calls[0][0] as any;
    const body = JSON.parse(callOpts.serializedBody);
    expect(body).toEqual(
      expect.objectContaining({
        input: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        stream: true,
      })
    );

    expect(response).toBeDefined();
    expect(response?.error).toBeNull();
    expect(response?.data).toBeDefined();

    if (response && response.error === null && response.data) {
      expect(response.data).toHaveProperty("output");
      const content = "output" in response.data ? response.data.output?.[0]?.content : undefined;
      expect(content).toEqual([{ type: "output_text", text: "Hello world" }]);
    }
    expect(result.current.isLoading).toBe(false);
  });

  describe("isLoading state reset on errors", () => {
    it("should reset isLoading to false when server returns 500 error", async () => {
      const serverError = new Error("Internal Server Error");
      (serverError as any).status = 500;

      mockCreateSseClient.mockReturnValue({
        stream: (async function* () {
          throw serverError;
        })(),
      } as any);

      const onErrorSpy = vi.fn();
      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
          onError: onErrorSpy,
        })
      );

      expect(result.current.isLoading).toBe(false);

      let response: SendMessageResult | undefined;

      await act(async () => {
        response = await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(onErrorSpy).toHaveBeenCalledWith(serverError);

      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when network error occurs", async () => {
      const networkError = new Error("Network request failed");

      mockCreateSseClient.mockReturnValue({
        stream: (async function* () {
          throw networkError;
        })(),
      } as any);

      const onErrorSpy = vi.fn();
      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
          onError: onErrorSpy,
        })
      );

      let response: SendMessageResult | undefined;

      await act(async () => {
        response = await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(onErrorSpy).toHaveBeenCalledWith(networkError);
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when SSE stream throws error mid-stream", async () => {
      mockCreateSseClient.mockReturnValue({
        stream: (async function* () {
          yield {
            type: "response.created",
            response: {
              id: "resp-123",
              model: "fireworks/accounts/fireworks/models/kimi-k2p5",
            },
          };
          yield {
            type: "response.output_text.delta",
            delta: { OfString: "Hello" },
          };
          throw new Error("Stream interrupted: 500 Internal Server Error");
        })(),
      } as any);

      const onErrorSpy = vi.fn();
      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
          onError: onErrorSpy,
        })
      );

      let response: SendMessageResult | undefined;

      await act(async () => {
        response = await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when request is aborted", async () => {
      mockCreateSseClient.mockReturnValue({
        stream: (async function* () {
          yield {
            type: "response.created",
            response: {
              id: "resp-123",
              model: "fireworks/accounts/fireworks/models/kimi-k2p5",
            },
          };
          await new Promise((resolve) => setTimeout(resolve, 100));
          yield {
            type: "response.output_text.delta",
            delta: { OfString: "Hello" },
          };
        })(),
      } as any);

      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
        })
      );

      let response: SendMessageResult | undefined;

      const sendPromise = (async () => {
        await act(async () => {
          response = await result.current.sendMessage({
            messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
            model: "fireworks/accounts/fireworks/models/kimi-k2p5",
          });
        });
      })();

      await act(async () => {
        result.current.stop();
      });

      await sendPromise;

      expect(response?.error).toBe("Request aborted");
      expect(result.current.isLoading).toBe(false);
    });

    it("should return success when signal aborts after the stream completed cleanly", async () => {
      let aborted: (() => void) | null = null;
      const abortGate = new Promise<void>((resolve) => {
        aborted = resolve;
      });

      mockCreateSseClient.mockReturnValue({
        stream: (async function* () {
          yield {
            type: "response.created",
            response: {
              id: "resp-123",
              model: "fireworks/accounts/fireworks/models/kimi-k2p5",
            },
          };
          yield {
            type: "response.output_text.delta",
            delta: { OfString: "Hello world" },
          };
          yield {
            type: "response.completed",
            response: { usage: { input_tokens: 10, output_tokens: 5 } },
          };
          await abortGate;
        })(),
      } as any);

      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
        })
      );

      let response: SendMessageResult | undefined;

      const sendPromise = (async () => {
        await act(async () => {
          response = await result.current.sendMessage({
            messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
            model: "fireworks/accounts/fireworks/models/kimi-k2p5",
          });
        });
      })();

      await new Promise((r) => setTimeout(r, 10));

      await act(async () => {
        result.current.stop();
        aborted!();
      });

      await sendPromise;

      expect(response?.error).toBeNull();
      expect(response?.data).toBeDefined();
    });

    it("should reset isLoading to false when token getter fails", async () => {
      const { result } = renderHook(() =>
        useChat({
          getToken: undefined,
        })
      );

      let response: SendMessageResult | undefined;

      await act(async () => {
        response = await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when token getter throws error", async () => {
      const tokenError = new Error("Failed to fetch auth token");

      const { result } = renderHook(() =>
        useChat({
          getToken: async () => {
            throw tokenError;
          },
        })
      );

      let response: SendMessageResult | undefined;

      await act(async () => {
        response = await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when SSE onSseError callback fires", async () => {
      mockCreateSseClient.mockImplementation((options: any) => {
        setTimeout(() => {
          if (options.onSseError) {
            options.onSseError(new Error("SSE connection failed: 500"));
          }
        }, 5);

        return {
          stream: (async function* () {
            yield {
              type: "response.created",
              response: {
                id: "resp-123",
                model: "fireworks/accounts/fireworks/models/kimi-k2p5",
              },
            };
            await new Promise((resolve) => setTimeout(resolve, 10));
          })(),
        } as any;
      });

      const onErrorSpy = vi.fn();
      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
          onError: onErrorSpy,
        })
      );

      let response: SendMessageResult | undefined;

      await act(async () => {
        response = await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false on validation errors", async () => {
      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
        })
      );

      let response: SendMessageResult | undefined;

      await act(async () => {
        response = await result.current.sendMessage({
          messages: [],
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("overlapping requests", () => {
    it("keeps isLoading true when an aborted older request settles while a newer one streams", async () => {
      let releaseB: () => void = () => {};
      const blockedB = new Promise<void>((resolve) => {
        releaseB = resolve;
      });
      let call = 0;
      mockCreateSseClient.mockImplementation(((opts: { signal?: AbortSignal }) => {
        const isFirst = call++ === 0;
        return {
          stream: (async function* () {
            yield { type: "response.created", response: { id: "r", model: "m" } };
            if (isFirst) {
              await new Promise<void>((resolve) => {
                if (opts.signal?.aborted) return resolve();
                opts.signal?.addEventListener("abort", () => resolve(), { once: true });
              });
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              throw err;
            }
            await blockedB;
            yield {
              type: "response.completed",
              response: { usage: { input_tokens: 1, output_tokens: 1 } },
            };
          })(),
        };
      }) as any);

      const { result } = renderHook(() => useChat({ getToken: async () => "fake-token" }));
      const messages = [
        { role: "user" as const, content: [{ type: "text" as const, text: "Hi" }] },
      ];

      let sendA: Promise<unknown>;
      let sendB: Promise<unknown>;
      await act(async () => {
        sendA = result.current.sendMessage({ messages, model: "m" });
        await new Promise((r) => setTimeout(r, 10));
      });
      await act(async () => {
        sendB = result.current.sendMessage({ messages, model: "m" });
        await sendA;
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        releaseB();
        await sendB;
      });
      expect(result.current.isLoading).toBe(false);
    });
  });
});
