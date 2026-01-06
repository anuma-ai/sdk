import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import { client } from "../client/client.gen";
import type { ServerSentEventsResult } from "../client/core/serverSentEvents.gen";

type SendMessageResult = Awaited<ReturnType<ReturnType<typeof useChat>["sendMessage"]>>;

vi.mock("../client/client.gen", () => ({
  client: {
    sse: {
      post: vi.fn(),
    },
  },
}));

describe("useChat", () => {
  it("should send message and handle stream response", async () => {
    const mockStream = (async function* () {
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
    })();

    const mockSseResult: ServerSentEventsResult<unknown> = {
      stream: mockStream,
    };

    vi.mocked(client.sse.post).mockResolvedValue(mockSseResult);

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

    expect(client.sse.post).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          input: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
          model: "gpt-3.5-turbo",
          stream: true,
        }),
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
});
