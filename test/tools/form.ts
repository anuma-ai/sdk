/**
 * E2E test: prompt_user_form tool
 *
 * Verifies that the model calls prompt_user_form with a valid title
 * and fields array when asked to collect structured information.
 *
 * Interactive tools have autoExecute: false, so the tool loop emits them
 * via onToolCall rather than executing them directly. We capture the call
 * and validate the LLM-provided arguments.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createFormTool } from "../../src/tools/form.js";
import { config, printResult } from "./setup.js";

const VALID_FIELD_TYPES = ["text", "textarea", "select", "toggle", "date", "slider"];

const toolOpts = {
  getContext: () => ({
    createInteraction: async () => ({ destination: "Tokyo", budget: 3000 }),
    createDisplayInteraction: () => {},
  }),
  getLastMessageId: () => undefined,
};

describe("prompt_user_form", () => {
  it("collects trip planning details with valid fields", async () => {
    const tool = createFormTool(toolOpts);
    const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Help me plan a trip. Use the prompt_user_form tool to ask me for: destination (text), travel dates (date), budget in USD (slider, 500 to 10000), and any special notes (textarea).",
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
    expect(toolCalls[0].name).toBe("prompt_user_form");

    const args = toolCalls[0].args;
    expect(args.title).toBeTruthy();
    expect(Array.isArray(args.fields)).toBe(true);
    expect((args.fields as any[]).length).toBeGreaterThanOrEqual(2);

    for (const field of args.fields as any[]) {
      expect(field.name).toBeTruthy();
      expect(field.label).toBeTruthy();
      expect(VALID_FIELD_TYPES).toContain(field.type);
    }
  });
});
