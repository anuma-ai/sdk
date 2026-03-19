/**
 * E2E test: prompt_user_choice tool
 *
 * Verifies that the model calls prompt_user_choice with a valid title
 * and options array when asked to present choices to the user.
 *
 * Interactive tools have autoExecute: false, so the tool loop emits them
 * via onToolCall rather than executing them directly. We capture the call
 * and validate the LLM-provided arguments.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createChoiceTool } from "../../src/tools/choice.js";
import { config, printResult } from "./setup.js";

const toolOpts = {
  getContext: () => ({
    createInteraction: async () => ({ selected: "italian" }),
    createDisplayInteraction: () => {},
  }),
  getLastMessageId: () => undefined,
};

describe("prompt_user_choice", () => {
  it("presents choices with valid title and options", async () => {
    const tool = createChoiceTool(toolOpts);
    const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I want to pick a cuisine for dinner. My options are Italian, Japanese, and Mexican. Use the prompt_user_choice tool to let me pick.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [tool],
      toolChoice: "auto",
      maxToolRounds: 3,
      onToolCall: (tc) => {
        toolCalls.push({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments),
        });
      },
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(toolCalls.length).toBeGreaterThanOrEqual(1);
    expect(toolCalls[0].name).toBe("prompt_user_choice");

    const args = toolCalls[0].args;
    expect(args.title).toBeTruthy();
    expect(Array.isArray(args.options)).toBe(true);
    expect((args.options as any[]).length).toBeGreaterThanOrEqual(2);

    for (const opt of args.options as any[]) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });
});
