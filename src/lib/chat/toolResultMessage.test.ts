import { describe, expect, it } from "vitest";

import { buildToolResultContent, MAX_PERSISTED_TOOL_RESULT_CHARS } from "./toolResultMessage";

/**
 * The cap is at the choke point and unconditional, because most tools have no
 * cap of their own: only `tools/github.ts` and `tools/dropbox.ts` bound their
 * responses, so a gmail or googleDrive payload arrives here unbounded. These
 * tests assert the bound holds regardless of which tool produced the result, and
 * that a payload under it is passed through untouched.
 */

/** A result whose JSON body lands just over/under the cap by `delta` chars. */
function resultOfBodyLength(name: string, bodyChars: number): { name: string; result: string } {
  // JSON.stringify wraps a string in quotes, and the per-result framing adds the
  // `Tool "<name>" returned: ` prefix — size the payload so the assembled summary
  // is exactly `bodyChars` long.
  const framing = `Tool "${name}" returned: ""`.length;
  return { name, result: "x".repeat(bodyChars - framing) };
}

describe("buildToolResultContent", () => {
  it("leaves a payload under the cap untouched", () => {
    const content = buildToolResultContent([{ name: "gmail_search", result: { id: "abc" } }]);

    expect(content).toBe(
      '[Tool Execution Results]\n\nTool "gmail_search" returned: {"id":"abc"}\n\nBased on these results, continue with the task.'
    );
    expect(content).not.toContain("truncated");
  });

  it("truncates a payload over the cap and says how much was dropped", () => {
    const over = 5_000;
    const content = buildToolResultContent([
      resultOfBodyLength("googleDrive_search", MAX_PERSISTED_TOOL_RESULT_CHARS + over),
    ]);

    expect(content).toContain(`... (tool output truncated, ${over} characters omitted)`);
    // Bounded: the cap plus the wrapper and the marker, not the original payload.
    expect(content.length).toBeLessThan(MAX_PERSISTED_TOOL_RESULT_CHARS + 500);
  });

  it("keeps the framing intact when it truncates", () => {
    // The row is replayed to the model on later turns, so the header and the
    // trailing instruction must survive — only the tool output gets cut.
    const content = buildToolResultContent([
      resultOfBodyLength("notion_search", MAX_PERSISTED_TOOL_RESULT_CHARS * 2),
    ]);

    expect(content.startsWith("[Tool Execution Results]\n\n")).toBe(true);
    expect(content.endsWith("\n\nBased on these results, continue with the task.")).toBe(true);
  });

  it("caps the combined size of many results, not each one", () => {
    // A single tool called repeatedly is how the oversized rows were actually
    // produced (the model re-fetching after a truncated response), so the bound
    // has to apply to the assembled summary.
    const each = MAX_PERSISTED_TOOL_RESULT_CHARS / 2;
    const content = buildToolResultContent([
      resultOfBodyLength("x_search", each),
      resultOfBodyLength("x_search", each),
      resultOfBodyLength("x_search", each),
    ]);

    expect(content).toContain("tool output truncated");
    expect(content.length).toBeLessThan(MAX_PERSISTED_TOOL_RESULT_CHARS + 500);
  });
});
