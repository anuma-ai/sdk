import { describe, it, expect } from "vitest";
import { runToolLoop } from "./setup.js";
import { createChoiceTool } from "../../src/tools/choice.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";

function makeAutoResolveContext(resolveWith: unknown) {
  return {
    getContext: () => ({
      createInteraction: async (_id: string, _type: string, _data: any) => resolveWith,
      createDisplayInteraction: () => {},
    }),
    getLastMessageId: () => undefined,
  };
}

describe("prompt_user_choice", () => {
  it("presents choices and processes the user selection", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createChoiceTool(makeAutoResolveContext({ selected: "italian" })), log);

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
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("prompt_user_choice");

    const args = log[0].args;
    expect(args.title).toBeTruthy();
    expect(Array.isArray(args.options)).toBe(true);
    expect((args.options as any[]).length).toBeGreaterThanOrEqual(2);

    for (const opt of args.options as any[]) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }

    const raw = log[0].result;
    const toolResult = typeof raw === "string" ? JSON.parse(raw) : raw;
    expect(toolResult.selected).toBe("italian");
    expect(toolResult._meta).toBeDefined();
    expect(toolResult._meta.title).toBeTruthy();
    expect(toolResult._meta.options.length).toBeGreaterThanOrEqual(2);

    const responseText = extractText(result).toLowerCase();
    expect(responseText).toContain("italian");
  });
});
