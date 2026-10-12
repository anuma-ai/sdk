import { describe, expect, it } from "vitest";

import { buildToolResultContent, MAX_PERSISTED_TOOL_RESULT_CHARS } from "./toolResultMessage";

const HEADER = "[Tool Execution Results]\n\n";
const MARKER_PATTERN = /\n\n\.\.\. \(tool output truncated, (\d+) characters omitted\)/;

function resultOfBodyLength(name: string, bodyChars: number): { name: string; result: string } {
  const framing = `Tool "${name}" returned: ""`.length;
  return { name, result: "x".repeat(bodyChars - framing) };
}

function maxedProviderResponse(): string {
  return `${"x".repeat(100_000)}\n\n... (truncated, 48213 characters omitted)`;
}

const DISPLAY_TOOL_REGEX = /Tool "display_(\w+)" returned: (.+)/g;

describe("buildToolResultContent", () => {
  it("leaves a payload under the cap untouched", () => {
    const content = buildToolResultContent([{ name: "gmail_search", result: { id: "abc" } }]);

    expect(content).toBe(
      '[Tool Execution Results]\n\nTool "gmail_search" returned: {"id":"abc"}\n\nBased on these results, continue with the task.'
    );
    expect(content).not.toContain("truncated");
  });

  it("truncates a payload over the cap and says how much was dropped", () => {
    const entryChars = MAX_PERSISTED_TOOL_RESULT_CHARS + 5_000;
    const content = buildToolResultContent([resultOfBodyLength("googleDrive_search", entryChars)]);

    const marker = MARKER_PATTERN.exec(content);
    expect(marker).not.toBeNull();
    const kept = content.indexOf("\n\n... (tool output truncated,") - HEADER.length;
    expect(kept + Number(marker?.[1])).toBe(entryChars);
    expect(content.length).toBeLessThanOrEqual(MAX_PERSISTED_TOOL_RESULT_CHARS);
  });

  it("keeps the framing intact when it truncates", () => {
    const content = buildToolResultContent([
      resultOfBodyLength("notion_search", MAX_PERSISTED_TOOL_RESULT_CHARS * 2),
    ]);

    expect(content.startsWith("[Tool Execution Results]\n\n")).toBe(true);
    expect(content.endsWith("\n\nBased on these results, continue with the task.")).toBe(true);
  });

  it("keeps the display entry when an earlier data fetch already fills the budget", () => {
    const content = buildToolResultContent([
      { name: "github_api", result: maxedProviderResponse() },
      {
        name: "display_chart",
        result: { displayType: "chart", data: [{ label: "bug", value: 12 }] },
      },
    ]);

    const matches = [...content.matchAll(DISPLAY_TOOL_REGEX)];
    expect(matches).toHaveLength(1);
    expect(JSON.parse(matches[0][2])).toEqual({
      displayType: "chart",
      data: [{ label: "bug", value: 12 }],
    });
    expect(content).toContain("tool output truncated");
    expect(content.length).toBeLessThanOrEqual(MAX_PERSISTED_TOOL_RESULT_CHARS);
  });

  it("caps the combined size of many results, not each one", () => {
    const each = MAX_PERSISTED_TOOL_RESULT_CHARS / 2;
    const content = buildToolResultContent([
      resultOfBodyLength("x_search", each),
      resultOfBodyLength("x_search", each),
      resultOfBodyLength("x_search", each),
    ]);

    expect(content).toContain("tool output truncated");
    expect(content.length).toBeLessThanOrEqual(MAX_PERSISTED_TOOL_RESULT_CHARS);
    expect(content.match(/tool output truncated/g)).toHaveLength(3);
  });

  it("leaves small results completely untouched", () => {
    const results = [
      { name: "gmail_search", result: { id: "a" } },
      { name: "display_chart", result: { displayType: "chart", data: [1, 2] } },
      { name: "notion_search", result: { id: "b" } },
    ];

    const content = buildToolResultContent(results);

    expect(content).not.toContain("truncated");
    for (const result of results) {
      expect(content).toContain(`Tool "${result.name}" returned: ${JSON.stringify(result.result)}`);
    }
  });

  it("holds the ceiling when the results outnumber the budget", () => {
    const results = Array.from({ length: 3_000 }, (_, i) =>
      resultOfBodyLength("x_search", 200 + i)
    );

    expect(buildToolResultContent(results).length).toBeLessThanOrEqual(
      MAX_PERSISTED_TOOL_RESULT_CHARS
    );
  });

  it("cannot keep a display payload that is oversized on its own parseable", () => {
    const content = buildToolResultContent([
      {
        name: "display_chart",
        result: { displayType: "chart", data: "y".repeat(MAX_PERSISTED_TOOL_RESULT_CHARS) },
      },
    ]);

    const matches = [...content.matchAll(DISPLAY_TOOL_REGEX)];
    expect(matches).toHaveLength(1);
    expect(() => JSON.parse(matches[0][2])).toThrow();
  });
});
