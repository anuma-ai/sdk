import { describe, it, expect } from "vitest";
import { ResponsesStrategy } from "./responses";
import type { StreamAccumulator } from "../types";

function createAccumulator(): StreamAccumulator {
  return {
    content: "",
    thinking: "",
    responseId: "",
    responseModel: "",
    usage: {},
    toolCalls: new Map(),
  };
}

describe("ResponsesStrategy.processStreamChunk - tool_call_events", () => {
  const strategy = new ResponsesStrategy();

  const sampleEvents = [
    {
      id: "evt_1",
      name: "generate_cloud_image",
      arguments: '{"prompt":"cat"}',
      output: '{"url":"https://example.com/cat.png","model":"flux-1"}',
    },
  ];

  it("captures tool_call_events from response.completed chunk", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      {
        type: "response.completed",
        response: {
          usage: { input_tokens: 10, output_tokens: 20 },
          tool_call_events: sampleEvents,
        },
      },
      acc
    );

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].name).toBe("generate_cloud_image");
    expect(acc.toolCallEvents![0].output).toContain("cat.png");
  });

  it("captures tool_call_events from top-level chunk", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].id).toBe("evt_1");
  });

  it("captures tool_call_events from nested response", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ response: { tool_call_events: sampleEvents } }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].arguments).toBe('{"prompt":"cat"}');
  });

  it("ignores empty tool_call_events array (does not block later capture)", () => {
    const acc = createAccumulator();

    // First chunk: empty array (e.g., from an early streaming event)
    strategy.processStreamChunk({ tool_call_events: [] }, acc);

    // Empty array should NOT have been stored
    expect(acc.toolCallEvents).toBeUndefined();

    // Second chunk: real events arrive later
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    // Real events should now be captured
    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].name).toBe("generate_cloud_image");
  });

  it("does not overwrite existing non-empty tool_call_events", () => {
    const acc = createAccumulator();

    // First chunk: real events
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    const secondEvents = [{ id: "evt_2", name: "edit_cloud_image", arguments: "{}", output: "{}" }];

    // Second chunk: different events — should be ignored
    strategy.processStreamChunk({ tool_call_events: secondEvents }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].id).toBe("evt_1");
  });

  it("preserves all fields (id, name, arguments, output)", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    const event = acc.toolCallEvents![0];
    expect(event.id).toBe("evt_1");
    expect(event.name).toBe("generate_cloud_image");
    expect(event.arguments).toBe('{"prompt":"cat"}');
    expect(event.output).toBe('{"url":"https://example.com/cat.png","model":"flux-1"}');
  });
});

describe("ResponsesStrategy.processStreamChunk - no duplicate content", () => {
  const strategy = new ResponsesStrategy();

  it("does not double-count content when deltas precede final response event", () => {
    const acc = createAccumulator();

    // Simulate streaming deltas arriving first
    strategy.processStreamChunk({ type: "response.output_text.delta", delta: "Hello " }, acc);
    strategy.processStreamChunk({ type: "response.output_text.delta", delta: "world" }, acc);
    expect(acc.content).toBe("Hello world");

    // Then the final response event arrives with the same text
    strategy.processStreamChunk(
      {
        type: "response",
        response: {
          id: "resp_123",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "Hello world" }],
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        },
      },
      acc
    );

    // Content should NOT be doubled
    expect(acc.content).toBe("Hello world");
    // But usage should still be extracted
    expect(acc.usage.prompt_tokens).toBe(10);
    expect(acc.usage.completion_tokens).toBe(5);
  });

  it("extracts content from response event when no deltas preceded it", () => {
    const acc = createAccumulator();

    // Non-streaming fallback: only the final response event, no deltas
    strategy.processStreamChunk(
      {
        type: "response",
        response: {
          id: "resp_456",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "Non-streamed response" }],
            },
          ],
          usage: { input_tokens: 8, output_tokens: 3 },
        },
      },
      acc
    );

    expect(acc.content).toBe("Non-streamed response");
    expect(acc.usage.prompt_tokens).toBe(8);
  });
});
