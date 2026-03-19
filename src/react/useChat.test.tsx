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
            model: "gpt-3.5-turbo",
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
        model: "gpt-3.5-turbo",
      });
    });

    // Verify createSseClient was called with correct request body
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
    const callOpts = mockCreateSseClient.mock.calls[0][0] as any;
    const body = JSON.parse(callOpts.serializedBody);
    expect(body).toEqual(
      expect.objectContaining({
        input: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        model: "gpt-3.5-turbo",
        stream: true,
      })
    );

    expect(response).toBeDefined();
    expect(response?.error).toBeNull();
    expect(response?.data).toBeDefined();

    // Type guard: after the assertions above, we know this is the success case
    if (response && response.error === null && response.data) {
      const content = response.data.output?.[0]?.content;
      expect(content).toEqual([{ type: "output_text", text: "Hello world" }]);
    }
    expect(result.current.isLoading).toBe(false);
  });

  describe("isLoading state reset on errors", () => {
    it("should reset isLoading to false when server returns 500 error", async () => {
      const serverError = new Error("Internal Server Error");
      (serverError as any).status = 500;

      // createSseClient returns a stream that throws on iteration
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
          model: "gpt-3.5-turbo",
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
          model: "gpt-3.5-turbo",
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
              model: "gpt-3.5-turbo",
            },
          };
          yield {
            type: "response.output_text.delta",
            delta: { OfString: "Hello" },
          };
          // Simulate error during streaming
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
          model: "gpt-3.5-turbo",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(onErrorSpy).toHaveBeenCalled();
      // Critical: verify isLoading was reset even though error occurred mid-stream
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when request is aborted", async () => {
      mockCreateSseClient.mockReturnValue({
        stream: (async function* () {
          yield {
            type: "response.created",
            response: {
              id: "resp-123",
              model: "gpt-3.5-turbo",
            },
          };
          // Keep yielding to simulate long-running request
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

      // Start the request
      const sendPromise = (async () => {
        await act(async () => {
          response = await result.current.sendMessage({
            messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
            model: "gpt-3.5-turbo",
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
          model: "gpt-3.5-turbo",
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
          model: "gpt-3.5-turbo",
        });
      });

      expect(response?.error).toBeTruthy();
      // Critical: verify isLoading was reset even when token getter fails
      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading to false when SSE onSseError callback fires", async () => {
      mockCreateSseClient.mockImplementation((options: any) => {
        // Trigger SSE error during streaming via the callback
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
                model: "gpt-3.5-turbo",
              },
            };
            // Wait for SSE error callback to fire
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
          model: "gpt-3.5-turbo",
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
          model: "gpt-3.5-turbo",
        });
      });

      expect(response?.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
