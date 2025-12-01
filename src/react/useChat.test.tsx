import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import { client } from "../client/client.gen";

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

    // @ts-ignore
    client.sse.post.mockResolvedValue({
      stream: mockStream,
    });

    const { result } = renderHook(() =>
      useChat({
        getToken: async () => "fake-token",
      })
    );

    let response: any;

    await act(async () => {
      response = await result.current.sendMessage({
        messages: [{ role: "user", content: "Hi" }],
        model: "gpt-3.5-turbo",
      });
    });

    expect(client.sse.post).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          messages: [{ role: "user", content: "Hi" }],
          model: "gpt-3.5-turbo",
          stream: true,
        }),
      })
    );

    expect(response.data?.choices[0].message.content).toBe("Hello world");
    expect(result.current.isLoading).toBe(false);
  });
});
