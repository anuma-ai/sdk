import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import { PiiRedactor } from "../pii/redactor";
import { extractAssistantText } from "./useChat/strategies/types";
import { runToolLoop } from "./toolLoop";

vi.mock("../../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return { ...orig, createSseClient: vi.fn() };
});

const mockCreateSseClient = vi.mocked(sseModule.createSseClient);

/** Build a Responses-API stream that emits the given text deltas in order. */
function makeStream(deltas: string[]) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    for (const d of deltas) {
      yield { type: "response.output_text.delta", delta: { OfString: d } };
    }
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

/** Build a Responses-API stream that emits a single function/tool call. */
function makeToolCallStream(opts: { callId: string; name: string; arguments: string }) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield {
      type: "response.output_item.added",
      item: { id: `item_${opts.callId}`, call_id: opts.callId, type: "function_call", name: opts.name, arguments: "" },
    };
    yield {
      type: "response.function_call_arguments.done",
      item_id: `item_${opts.callId}`,
      call_id: opts.callId,
      arguments: opts.arguments,
    };
    yield { type: "response.completed", response: { usage: { input_tokens: 1, output_tokens: 1 } } };
  })();
}

function getRequestMessages(callIndex: number): { role?: string; content?: unknown }[] {
  const opts = mockCreateSseClient.mock.calls[callIndex][0] as { serializedBody: string };
  const body = JSON.parse(opts.serializedBody);
  return body.input ?? body.messages ?? [];
}

describe("runToolLoop PII redaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redacts PII in the request body before it reaches the provider", async () => {
    mockCreateSseClient.mockReturnValue({ stream: makeStream(["ok"]) } as never);

    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "My email is bob@acme.com" }] }],
      model: "test-model",
      token: "token",
      piiRedaction: true,
      smoothing: { enabled: false },
    });

    const serialized = JSON.stringify(getRequestMessages(0));
    expect(serialized).toContain("[EMAIL_1]");
    expect(serialized).not.toContain("bob@acme.com");
  });

  it("de-anonymizes streamed output even when a placeholder is split across chunks", async () => {
    // The redactor maps bob@acme.com -> [EMAIL_1] when redacting the request; the
    // model then echoes that placeholder, split across two deltas.
    mockCreateSseClient.mockReturnValue({
      stream: makeStream(["Sure, I'll email [EMA", "IL_1] now"]),
    } as never);

    let streamed = "";
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "email bob@acme.com" }] }],
      model: "test-model",
      token: "token",
      piiRedaction: true,
      smoothing: { enabled: false },
      onData: (chunk) => (streamed += chunk),
    });

    expect(streamed).toBe("Sure, I'll email bob@acme.com now");
    expect(streamed).not.toContain("[EMAIL_1]");
  });

  it("returns de-anonymized content in result.data (not placeholders)", async () => {
    mockCreateSseClient.mockReturnValue({
      stream: makeStream(["Noted: [EMAIL_1]"]),
    } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "contact bob@acme.com" }] }],
      model: "test-model",
      token: "token",
      piiRedaction: true,
      smoothing: { enabled: false },
    });

    const { content } = extractAssistantText(result.data!);
    expect(content).toBe("Noted: bob@acme.com");
    expect(content).not.toContain("[EMAIL_1]");
  });

  it("fires onPiiRedacted with the matches found", async () => {
    mockCreateSseClient.mockReturnValue({ stream: makeStream(["ok"]) } as never);
    const onPiiRedacted = vi.fn();

    await runToolLoop({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "bob@acme.com and 555-123-4567" }],
        },
      ],
      model: "test-model",
      token: "token",
      piiRedaction: true,
      smoothing: { enabled: false },
      onPiiRedacted,
    });

    expect(onPiiRedacted).toHaveBeenCalledTimes(1);
    const matches = onPiiRedacted.mock.calls[0][0] as { category: string }[];
    expect(matches.map((m) => m.category).sort()).toEqual(["EMAIL", "PHONE"]);
  });

  it("keeps placeholders consistent across turns with a shared redactor", async () => {
    const redactor = new PiiRedactor();

    mockCreateSseClient.mockReturnValue({ stream: makeStream(["ok"]) } as never);
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "I am bob@acme.com" }] }],
      model: "test-model",
      token: "token",
      piiRedaction: redactor,
      smoothing: { enabled: false },
    });

    mockCreateSseClient.mockReturnValue({ stream: makeStream(["ok"]) } as never);
    await runToolLoop({
      messages: [
        { role: "user", content: [{ type: "text", text: "I am bob@acme.com" }] },
        { role: "assistant", content: [{ type: "text", text: "hello" }] },
        { role: "user", content: [{ type: "text", text: "still bob@acme.com" }] },
      ],
      model: "test-model",
      token: "token",
      piiRedaction: redactor,
      smoothing: { enabled: false },
    });

    const secondRequest = JSON.stringify(getRequestMessages(1));
    expect(secondRequest).toContain("[EMAIL_1]");
    expect(secondRequest).not.toContain("bob@acme.com");
  });

  it("does not redact when piiRedaction is omitted", async () => {
    mockCreateSseClient.mockReturnValue({ stream: makeStream(["ok"]) } as never);

    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "email bob@acme.com" }] }],
      model: "test-model",
      token: "token",
      smoothing: { enabled: false },
    });

    const serialized = JSON.stringify(getRequestMessages(0));
    expect(serialized).toContain("bob@acme.com");
    expect(serialized).not.toContain("[EMAIL_1]");
  });

  it("de-anonymizes tool arguments for tools that opt in via deAnonymizeArgs", async () => {
    // Round 1: model calls the tool with the placeholder it saw. Round 2: text.
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({
          callId: "c1",
          name: "memory_save",
          arguments: JSON.stringify({ content: "User's email is [EMAIL_1]" }),
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeStream(["done"]) } as never);

    let received: unknown;
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "my email is bob@acme.com" }] }],
      model: "test-model",
      token: "token",
      piiRedaction: true,
      smoothing: { enabled: false },
      tools: [
        {
          type: "function",
          function: { name: "memory_save", parameters: { type: "object", properties: {} } },
          executor: async (args: Record<string, unknown>) => {
            received = args.content;
            return "saved";
          },
          deAnonymizeArgs: true,
        },
      ],
    });

    // The executor must receive the REAL value, not the placeholder.
    expect(received).toBe("User's email is bob@acme.com");
  });

  it("leaves tool arguments redacted for tools that do NOT opt in", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({
          callId: "c1",
          name: "send_external",
          arguments: JSON.stringify({ to: "[EMAIL_1]" }),
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeStream(["done"]) } as never);

    let received: unknown;
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "my email is bob@acme.com" }] }],
      model: "test-model",
      token: "token",
      piiRedaction: true,
      smoothing: { enabled: false },
      tools: [
        {
          type: "function",
          function: { name: "send_external", parameters: { type: "object", properties: {} } },
          executor: async (args: Record<string, unknown>) => {
            received = args.to;
            return "sent";
          },
          // no deAnonymizeArgs -> stays redacted (e.g. a connector/forwarding tool)
        },
      ],
    });

    expect(received).toBe("[EMAIL_1]");
  });
});
