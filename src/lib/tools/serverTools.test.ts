import { describe, expect, it } from "vitest";
import { createServerToolsFilter, findMatchingTools, type ServerTool } from "./serverTools";

function unitVectorWithScore(name: string, score?: number): ServerTool {
  return {
    type: "function",
    name,
    description: name,
    parameters: { type: "object", properties: {}, required: [] },
    embedding: score === undefined ? undefined : [score, Math.sqrt(1 - score * score)],
  };
}

describe("createServerToolsFilter", () => {
  it("keeps anchor scores that are filtered out by relevance ratio for set expansion", () => {
    const tools = [
      unitVectorWithScore("add_slide", 0.63),
      unitVectorWithScore("patch_slides", 0.55),
      unitVectorWithScore("plan_deck"),
      unitVectorWithScore("read_slides"),
    ];
    const promptEmbedding = [1, 0];
    const matchOptions = { limit: 10, minSimilarity: 0.5, relevanceRatio: 0.9 };

    expect(findMatchingTools(promptEmbedding, tools, matchOptions).map((m) => m.tool.name)).toEqual(
      ["add_slide"]
    );

    const filter = createServerToolsFilter({
      matchOptions,
      toolSets: [
        {
          name: "slides",
          members: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
          anchors: ["patch_slides"],
          anchorMinSimilarity: 0.55,
        },
      ],
    });

    expect(filter(promptEmbedding, tools)).toEqual(
      expect.arrayContaining(["plan_deck", "add_slide", "read_slides", "patch_slides"])
    );
  });
});
