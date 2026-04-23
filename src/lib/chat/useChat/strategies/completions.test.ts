import { describe, it, expect } from "vitest";
import { CompletionsStrategy } from "./completions";
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

describe("CompletionsStrategy.processStreamChunk - tool_call_events", () => {
  const strategy = new CompletionsStrategy();

  const sampleEvents = [
    {
      id: "evt_1",
      name: "generate_cloud_image",
      arguments: '{"prompt":"cat"}',
      output: '{"url":"https://example.com/cat.png","model":"flux-1"}',
    },
  ];

  it("captures tool_call_events from top-level chunk", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].name).toBe("generate_cloud_image");
    expect(acc.toolCallEvents![0].output).toContain("cat.png");
  });

  it("captures tool_call_events from nested response", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ response: { tool_call_events: sampleEvents } }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].arguments).toBe('{"prompt":"cat"}');
  });

  it("captures tool_call_events from wrapped response format", () => {
    const acc = createAccumulator();
    // CompletionsStrategy unwraps { response: {...}, type: "response" }
    strategy.processStreamChunk(
      {
        type: "response",
        response: {
          tool_call_events: sampleEvents,
        },
      },
      acc
    );

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].id).toBe("evt_1");
  });

  it("ignores empty tool_call_events array (does not block later capture)", () => {
    const acc = createAccumulator();

    // First chunk: empty array
    strategy.processStreamChunk({ tool_call_events: [] }, acc);

    // Empty array should NOT have been stored
    expect(acc.toolCallEvents).toBeUndefined();

    // Second chunk: real events
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].name).toBe("generate_cloud_image");
  });

  it("does not overwrite existing non-empty tool_call_events", () => {
    const acc = createAccumulator();

    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    const secondEvents = [{ id: "evt_2", name: "edit_cloud_image", arguments: "{}", output: "{}" }];

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

// Whitespace-only deltas (regression — see PR for details).
//
// Chat-completions streams tokenize text like `"## Heading\n\nBody"` into
// multiple `choice.delta.content` chunks, including pure-whitespace ones
// (`"\n\n"`, `"  \n"`, `" "`). These must reach the app's `onData` callback
// or the client's live `streamingContent` ends up glued (e.g. `## HeadingBody`).
// An earlier `parseResult.messageContent.trim().length > 0` check silently
// dropped whitespace-only chunks — the final response was fine (accumulator
// captured them) but per-chunk onData was not.
describe("CompletionsStrategy.processStreamChunk - whitespace-only deltas", () => {
  const strategy = new CompletionsStrategy();

  it("emits `\\n\\n` delta content (paragraph break between heading and body)", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { choices: [{ delta: { content: "\n\n" } }] },
      acc
    );
    expect(out.content).toBe("\n\n");
    expect(acc.content).toBe("\n\n");
  });

  it("emits single `\\n` delta (intra-paragraph line break)", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { choices: [{ delta: { content: "\n" } }] },
      acc
    );
    expect(out.content).toBe("\n");
    expect(acc.content).toBe("\n");
  });

  it("emits `  \\n` delta (markdown hard break between sentences)", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { choices: [{ delta: { content: "  \n" } }] },
      acc
    );
    expect(out.content).toBe("  \n");
    expect(acc.content).toBe("  \n");
  });

  it("emits a single-space delta", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { choices: [{ delta: { content: " " } }] },
      acc
    );
    expect(out.content).toBe(" ");
    expect(acc.content).toBe(" ");
  });

  it("preserves end-to-end whitespace when chunks are accumulated in order", () => {
    const acc = createAccumulator();
    const deltas = ["## ", "Heading", "\n\n", "Body"];
    const emitted: string[] = [];
    for (const content of deltas) {
      const out = strategy.processStreamChunk({ choices: [{ delta: { content } }] }, acc);
      if (out.content !== undefined) emitted.push(out.content);
    }
    expect(emitted.join("")).toBe("## Heading\n\nBody");
    expect(acc.content).toBe("## Heading\n\nBody");
  });
});
