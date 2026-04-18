import { describe, expect, it } from "vitest";

import type { AccumulatedToolCall } from "../types";
import { mergeXaiInlineParameterTags } from "./xaiToolFormat";

function makeToolCall(overrides: Partial<AccumulatedToolCall> = {}): AccumulatedToolCall {
  return {
    id: "call_1",
    type: "function",
    name: "create_file",
    arguments: '{"path":"slides.json"}',
    status: "pending",
    ...overrides,
  };
}

describe("mergeXaiInlineParameterTags", () => {
  it("merges a <parameter> block into an existing partial tool call", () => {
    const tc = makeToolCall();
    const toolCalls = new Map([["k", tc]]);
    const content =
      '<parameter name="content">{"version":2,"slides":[]}</parameter>\n</xai:function_call>';

    const result = mergeXaiInlineParameterTags(content, toolCalls);

    expect(result).toBe("");
    const args = JSON.parse(tc.arguments) as Record<string, string>;
    expect(args.path).toBe("slides.json");
    expect(args.content).toBe('{"version":2,"slides":[]}');
  });

  it("handles multi-line XML content values", () => {
    const tc = makeToolCall();
    const toolCalls = new Map([["k", tc]]);
    const content = `<parameter name="content">{
  "version": 2,
  "slides": []
}</parameter>
</xai:function_call>`;

    mergeXaiInlineParameterTags(content, toolCalls);

    const args = JSON.parse(tc.arguments) as Record<string, string>;
    expect(args.content).toContain('"version": 2');
    expect(args.content).toContain('"slides": []');
  });

  it("pairs multiple tool calls with their <parameter> blocks by position", () => {
    const tc1 = makeToolCall({ id: "c1", arguments: '{"path":"a.txt"}' });
    const tc2 = makeToolCall({ id: "c2", arguments: '{"path":"b.txt"}' });
    const toolCalls = new Map([
      ["k1", tc1],
      ["k2", tc2],
    ]);
    const content = `<parameter name="content">AAA</parameter></xai:function_call><parameter name="content">BBB</parameter></xai:function_call>`;

    mergeXaiInlineParameterTags(content, toolCalls);

    expect((JSON.parse(tc1.arguments) as { content: string }).content).toBe("AAA");
    expect((JSON.parse(tc2.arguments) as { content: string }).content).toBe("BBB");
  });

  it("does not overwrite args that are already set", () => {
    const tc = makeToolCall({ arguments: '{"path":"real.json","content":"original"}' });
    const toolCalls = new Map([["k", tc]]);
    const content = '<parameter name="content">overridden</parameter></xai:function_call>';

    mergeXaiInlineParameterTags(content, toolCalls);

    const args = JSON.parse(tc.arguments) as Record<string, string>;
    expect(args.content).toBe("original");
  });

  it("is a no-op when content has no <parameter> tags", () => {
    const tc = makeToolCall();
    const toolCalls = new Map([["k", tc]]);
    const content = "Just some normal assistant text.";

    const result = mergeXaiInlineParameterTags(content, toolCalls);

    expect(result).toBe(content);
    expect(tc.arguments).toBe('{"path":"slides.json"}');
  });

  it("is a no-op when there are no tool calls", () => {
    const toolCalls = new Map<string, AccumulatedToolCall>();
    const content =
      '<parameter name="content">{"a":1}</parameter></xai:function_call>';

    const result = mergeXaiInlineParameterTags(content, toolCalls);

    expect(result).toBe(content);
  });

  it("strips <xai:function_call> and <invoke> wrapper tags from output", () => {
    const tc = makeToolCall({ arguments: "{}" });
    const toolCalls = new Map([["k", tc]]);
    const content =
      '<xai:function_call name="create_file"><invoke><parameter name="path">foo</parameter></invoke></xai:function_call>';

    const result = mergeXaiInlineParameterTags(content, toolCalls);

    expect(result).toBe("");
  });

  it("tolerates tool calls with invalid JSON in arguments", () => {
    const tc = makeToolCall({ arguments: "not json at all" });
    const toolCalls = new Map([["k", tc]]);
    const content = '<parameter name="content">ok</parameter></xai:function_call>';

    mergeXaiInlineParameterTags(content, toolCalls);

    const args = JSON.parse(tc.arguments) as Record<string, string>;
    expect(args.content).toBe("ok");
  });

  it("leaves unrelated text in content untouched while stripping params", () => {
    const tc = makeToolCall();
    const toolCalls = new Map([["k", tc]]);
    const content =
      'Here is the deck:\n<parameter name="content">body</parameter>\n</xai:function_call>\nDone!';

    const result = mergeXaiInlineParameterTags(content, toolCalls);

    expect(result).toBe("Here is the deck:\n\n\nDone!".trim());
  });
});
