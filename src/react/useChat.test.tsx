import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerSentEventsOptions } from "../client/core/serverSentEvents.gen";
import * as sseModule from "../client/core/serverSentEvents.gen";
import { makeMockSseResult } from "../test-utils/mocks";
import { useChat } from "./useChat";

type SendMessageResult = Awaited<ReturnType<ReturnType<typeof useChat>["sendMessage"]>>;

/** Error with an HTTP-style status attached — mirrors what the SSE layer surfaces. */
interface HttpLikeError extends Error {
  status?: number;
}

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
    mockCreateSseClient.mockReturnValue(
      makeMockSseResult([
        {
          type: "response.created",
          response: {
            id: "resp-123",
            model: "fireworks/accounts/fireworks/models/kimi-k2p5",
          },
        },
        {
          type: "response.output_text.delta",
          delta: { OfString: "Hello" },
        },
        {
          type: "response.output_text.delta",
          delta: { OfString: " world" },
        },
        {
          type: "response.completed",
          response: {
            usage: {
              input_tokens: 10,
              output_tokens: 5,
            },
          },
        },
      ])
    );

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

    // Verify createSseClient was called with correct request body
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
    const callOpts = mockCreateSseClient.mock.calls[0][0];
    const body = JSON.parse(callOpts.serializedBody as string) as Record<string, unknown>;
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

    // Assert the shape explicitly so regressions in response variant fail loudly.
    if (response && response.error === null && response.data) {
      expect("output" in response.data).toBe(true);
      if ("output" in response.data) {
        const content = response.data.output?.[0]?.content;
        expect(content).toEqual([{ type: "output_text", text: "Hello world" }]);
      }
    }
    expect(result.current.isLoading).toBe(false);
  });

  describe("isLoading state reset on errors", () => {
    it("should reset isLoading to false when server returns 500 error", async () => {
      const serverError: HttpLikeError = new Error("Internal Server Error");
      serverError.status = 500;

      // createSseClient returns a stream that throws on iteration
      mockCreateSseClient.mockReturnValue(
        makeMockSseResult(() =>
          // eslint-disable-next-line require-yield -- throw-only generator by design
          (async function* () {
            throw serverError;
          })()
        )
      );

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

      // Verify error was handled
      expect(response?.error).toBeTruthy();
      expect(onErrorSpy).toHaveBeenCalledWith(serverError);

      // Critical: verify isLoading was reset to false
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when network error occurs", async () => {
      const networkError = new Error("Network request failed");

      mockCreateSseClient.mockReturnValue(
        makeMockSseResult(() =>
          // eslint-disable-next-line require-yield -- throw-only generator by design
          (async function* () {
            throw networkError;
          })()
        )
      );

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
      mockCreateSseClient.mockReturnValue(
        makeMockSseResult(() =>
          (async function* () {
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
            // Simulate error during streaming
            throw new Error("Stream interrupted: 500 Internal Server Error");
          })()
        )
      );

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
      // Critical: verify isLoading was reset even though error occurred mid-stream
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when request is aborted", async () => {
      mockCreateSseClient.mockReturnValue(
        makeMockSseResult(() =>
          (async function* () {
            yield {
              type: "response.created",
              response: {
                id: "resp-123",
                model: "fireworks/accounts/fireworks/models/kimi-k2p5",
              },
            };
            // Keep yielding to simulate long-running request
            await new Promise((resolve) => setTimeout(resolve, 100));
            yield {
              type: "response.output_text.delta",
              delta: { OfString: "Hello" },
            };
          })()
        )
      );

      const { result } = renderHook(() =>
        useChat({
          getToken: async () => "fake-token",
        })
      );

      let response: SendMessageResult | undefined;

      // Start the request
      const sendPromise = (async () => {
        await act(async () => {
          response = await result.current.sendMessage({
            messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
            model: "fireworks/accounts/fireworks/models/kimi-k2p5",
          });
        });
      })();

      // Abort it immediately
      await act(async () => {
        result.current.stop();
      });

      await sendPromise;

      expect(response?.error).toBe("Request aborted");
      // Critical: verify isLoading was reset after abort
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when token getter fails", async () => {
      const { result } = renderHook(() =>
        useChat({
          getToken: undefined, // Missing token getter
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
      // Critical: verify isLoading was reset even when token getter fails
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when SSE onSseError callback fires", async () => {
      mockCreateSseClient.mockImplementation((options: ServerSentEventsOptions) => {
        // Trigger SSE error during streaming via the callback
        setTimeout(() => {
          if (options.onSseError) {
            options.onSseError(new Error("SSE connection failed: 500"));
          }
        }, 5);

        return makeMockSseResult(() =>
          (async function* () {
            yield {
              type: "response.created",
              response: {
                id: "resp-123",
                model: "fireworks/accounts/fireworks/models/kimi-k2p5",
              },
            };
            // Wait for SSE error callback to fire
            await new Promise((resolve) => setTimeout(resolve, 10));
          })()
        );
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

      // After stream completes, sseError is checked and thrown
      expect(response?.error).toBeTruthy();
      expect(onErrorSpy).toHaveBeenCalled();
      // Critical: verify isLoading was reset when SSE error occurs
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
          messages: [], // Invalid: empty messages
          model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
