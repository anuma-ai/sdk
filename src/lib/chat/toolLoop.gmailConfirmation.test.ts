import { expect, test, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import { createGmailTools } from "../../tools/gmail";
import { runToolLoop } from "./toolLoop";

vi.mock("../../client/core/serverSentEvents.gen", async (importOriginal) => {
  const original = await importOriginal<typeof sseModule>();
  return { ...original, createSseClient: vi.fn() };
});

test("runToolLoop returns Gmail sends to the host without a confirmation callback", async () => {
  const args = {
    to: "ada@example.com",
    subject: "hi",
    body: "hello",
    cc: "charles@example.com",
    bcc: "grace@example.com",
    confirmed: true,
  };
  const toolCall = {
    id: "send-1",
    type: "function" as const,
    function: { name: "gmail_send_message", arguments: JSON.stringify(args) },
  };
  vi.mocked(sseModule.createSseClient)
    .mockReturnValue({
      stream: (async function* () {
        yield { type: "response.completed", response: {} };
      })(),
    } as never)
    .mockReturnValueOnce({
      stream: (async function* () {
        yield { type: "response.created", response: { id: "r", model: "m" } };
        yield {
          type: "response.output_item.added",
          item: {
            id: "item_send-1",
            call_id: toolCall.id,
            type: "function_call",
            name: toolCall.function.name,
            arguments: "",
          },
        };
        yield {
          type: "response.function_call_arguments.done",
          item_id: "item_send-1",
          call_id: toolCall.id,
          arguments: toolCall.function.arguments,
        };
        yield {
          type: "response.completed",
          response: { usage: { input_tokens: 10, output_tokens: 10 } },
        };
      })(),
    } as never);
  const getToken = vi.fn().mockResolvedValue("send-capable-token");
  const requestAccess = vi.fn();
  const tools = createGmailTools(getToken, requestAccess);
  const onToolCall = vi.fn();
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ id: "sent-1", threadId: "t1" })));
  try {
    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "read my email" }] }],
      model: "test-model",
      token: "token",
      tools: [tools.gmail_send_message],
      onToolCall,
    });
    expect(result.error).toBeNull();
    expect(onToolCall).toHaveBeenCalledExactlyOnceWith(toolCall);
    expect(result.data).toMatchObject({
      output: expect.arrayContaining([
        expect.objectContaining({
          type: "function_call",
          call_id: toolCall.id,
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        }),
      ]),
    });
    expect(tools.gmail_send_message.executor).toBeUndefined();
    expect(getToken).not.toHaveBeenCalled();
    expect(requestAccess).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sseModule.createSseClient).toHaveBeenCalledTimes(1);
  } finally {
    fetchMock.mockRestore();
  }
});
