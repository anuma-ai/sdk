import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import { client } from "../client/client.gen";
import type { LlmapiChatCompletionResponse } from "../client";
import type { ServerSentEventsResult } from "../client/core/serverSentEvents.gen";

type SendMessageResult =
  | { data: LlmapiChatCompletionResponse; error: null }
  | { data: null; error: string };

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
        id: "chatcmpl-123",
        model: "gpt-3.5-turbo",
        choices: [{ delta: { content: "Hello", role: "assistant" }, index: 0 }],
      };
      yield {
        choices: [
          { delta: { content: " world", role: "assistant" }, index: 0 },
        ],
      };
      yield {
        choices: [{ delta: {}, finish_reason: "stop", index: 0 }],
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
          messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
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
      const content = response.data.choices?.[0]?.message?.content;
      expect(content).toEqual([{ type: "text", text: "Hello world" }]);
    }
    expect(result.current.isLoading).toBe(false);
  });
});
