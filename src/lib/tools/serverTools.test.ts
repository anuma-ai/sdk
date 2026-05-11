import { describe, expect, it } from "vitest";

import { createServerToolsFilter, type ServerTool } from "./serverTools";

function serverTool(name: string, embedding: number[]): ServerTool {
  return {
    type: "function",
    name,
    description: name,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    embedding,
  };
}

describe("createServerToolsFilter", () => {
  it("uses raw scores to activate sets when matching filters drop an anchor", () => {
    const filter = createServerToolsFilter({
      toolSets: [
        {
          name: "workflow",
          anchors: ["anchor"],
          members: ["anchor", "member"],
          anchorMinSimilarity: 0.75,
        },
      ],
      matchOptions: {
        limit: 5,
        minSimilarity: 0,
        relevanceRatio: 0.9,
      },
    });

    const selected = filter(
      [1, 0],
      [
        serverTool("dominant", [1, 0]),
        serverTool("anchor", [0.8, 0.6]),
        serverTool("member", [0, 1]),
      ]
    );

    expect(selected).toEqual(["dominant", "anchor", "member"]);
  });
});
