/**
 * E2E test: prompt_user_form tool
 *
 * Verifies that the model calls prompt_user_form with a valid title
 * and fields array when asked to collect structured information.
 *
 * The tool uses an auto-resolving mock context so the executor returns
 * immediately with the simulated user submission.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createFormTool } from "../../src/tools/form.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";

const VALID_FIELD_TYPES = ["text", "textarea", "select", "toggle", "date", "slider"];

function makeAutoResolveContext(resolveWith: unknown) {
  return {
    getContext: () => ({
      createInteraction: async (_id: string, _type: string, _data: any) => resolveWith,
      createDisplayInteraction: () => {},
    }),
    getLastMessageId: () => undefined,
  };
}

describe("prompt_user_form", () => {
  it("collects trip planning details with valid fields", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(
      createFormTool(
        makeAutoResolveContext({
          destination: "Tokyo",
          dates: "2026-04-10",
          budget: 3000,
          notes: "Vegetarian meals preferred",
        }),
      ),
      log,
    );

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
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("prompt_user_form");

    const args = log[0].args;
    expect(args.title).toBeTruthy();
    expect(Array.isArray(args.fields)).toBe(true);
    expect((args.fields as any[]).length).toBeGreaterThanOrEqual(2);

    for (const field of args.fields as any[]) {
      expect(field.name).toBeTruthy();
      expect(field.label).toBeTruthy();
      expect(VALID_FIELD_TYPES).toContain(field.type);
    }

    const responseText = extractText(result).toLowerCase();
    expect(responseText).toContain("tokyo");
  });
});
