import { describe, expect, it } from "vitest";

import {
  defaultServerToolsFilter,
  DEFAULT_SERVER_TOOLS_MATCH_OPTIONS,
  findMatchingTools,
  type ServerTool,
} from "./serverTools";

// Synthetic axis-aligned embeddings. Each tool occupies a single dimension
// of a 4-D space so cosine similarity values are easy to reason about:
//   cos([1,0,0,0], [a,b,c,d]) = a / sqrt(a²+b²+c²+d²)
// A neutral prompt with uniform components hits every tool at the same
// (low) score with zero gap — exactly the ambiguity-filter trigger.
function tool(name: string, embedding: number[]): ServerTool {
  return {
    type: "function",
    name,
    description: `${name} test tool`,
    parameters: { type: "object", properties: {}, required: [] },
    embedding,
  };
}

describe("DEFAULT_SERVER_TOOLS_MATCH_OPTIONS", () => {
  it("enables filterAmbiguous and relevanceRatio so the chat filter matches the standalone selector", () => {
    // Pin the contract — if these get reset to false/0, generic prompts
    // start pulling expensive tools again (the production bug this PR fixes).
    expect(DEFAULT_SERVER_TOOLS_MATCH_OPTIONS.filterAmbiguous).toBe(true);
    expect(DEFAULT_SERVER_TOOLS_MATCH_OPTIONS.relevanceRatio).toBe(0.85);
    expect(DEFAULT_SERVER_TOOLS_MATCH_OPTIONS.limit).toBe(5);
    expect(DEFAULT_SERVER_TOOLS_MATCH_OPTIONS.minSimilarity).toBe(0.5);
  });
});

describe("defaultServerToolsFilter", () => {
  // Three tools, each occupying its own axis. A prompt aligned with one
  // axis matches only that tool; a uniform prompt matches all three
  // equally with a low score — the headline ambiguity case.
  const axisTools: ServerTool[] = [
    tool("search_web", [1, 0, 0, 0]),
    tool("AnumaMediaMCP-anuma_create_music", [0, 1, 0, 0]),
    tool("AnumaMediaMCP-anuma_create_video", [0, 0, 1, 0]),
  ];

  it("returns no tools for an ambiguous neutral prompt (the 'hello' case)", () => {
    // Uniform prompt → all three tools score exactly 0.5 / 0.9 ≈ 0.5,
    // with a zero gap between them. ambiguityThreshold=0.55 → top is
    // below; minLead=0.04 → gap is below. Filter returns [].
    //
    // Pre-PR this returned all three tools including the expensive
    // media ones, which then ended up in the portal hold computation
    // and gated free-tier users out of chat entirely. The portal-side
    // defenses in ai-portal#1085 + #1083 + #1079 fix the symptom; this
    // PR fixes the cause.
    const neutral = [0.45, 0.45, 0.45, 0.45];
    const names = defaultServerToolsFilter(neutral, axisTools);
    expect(names).toEqual([]);
  });

  it("returns the relevant tool for a clearly media-related prompt", () => {
    // Negative control: when one tool clearly stands out (similarity
    // 1.0 vs others at 0), the filter still attaches it.
    const mediaPrompt = [0, 0.95, 0, 0];
    const names = defaultServerToolsFilter(mediaPrompt, axisTools);
    expect(names).toContain("AnumaMediaMCP-anuma_create_music");
    expect(names).not.toContain("search_web");
    expect(names).not.toContain("AnumaMediaMCP-anuma_create_video");
  });

  it("returns the relevant tool for a clearly text-related prompt", () => {
    const textPrompt = [0.95, 0, 0, 0];
    const names = defaultServerToolsFilter(textPrompt, axisTools);
    expect(names).toEqual(["search_web"]);
  });

  it("trims tail tools that fall below the relevanceRatio cutoff", () => {
    // Setup: one strong match (sim ≈ 1.0) and one moderate one (sim ≈ 0.6).
    // relevanceRatio=0.85 cuts the moderate one even though it's above
    // minSimilarity (0.5). This is the "tail trimming" guarantee — once
    // a clear winner exists, weakly-related tools don't fill the limit.
    const withWeakTail: ServerTool[] = [
      tool("strong_match", [1, 0, 0, 0]),
      tool("moderate_match", [0.6, 0, 0, 0.8]),
    ];
    const prompt = [1, 0, 0, 0];
    // cos(strong, prompt) = 1.0
    // cos(moderate, prompt) = 0.6 / 1.0 = 0.6 → above minSim=0.5, below 0.85*1.0=0.85.
    const names = defaultServerToolsFilter(prompt, withWeakTail);
    expect(names).toEqual(["strong_match"]);
    expect(names).not.toContain("moderate_match");
  });

  it("applies the default exclusion list (vision, openmeteo geocoding/forecast)", () => {
    // Pre-existing behaviour, unchanged. Pinned here so a future
    // refactor of the exclusion mechanism doesn't silently regress.
    // Use a strong-winner prompt so we can also verify that the
    // non-excluded media tool DOES survive.
    const visionTools: ServerTool[] = [
      tool("AnumaVisionMCP-anuma_analyze_image", [0, 1, 0, 0]),
      tool("OpenMeteoMCP-geocoding", [0, 1, 0, 0]),
      tool("OpenMeteoMCP-weather_forecast", [0, 1, 0, 0]),
      tool("AnumaMediaMCP-anuma_create_music", [0, 1, 0, 0]),
    ];
    const names = defaultServerToolsFilter([0, 0.95, 0, 0], visionTools);
    expect(names).not.toContain("AnumaVisionMCP-anuma_analyze_image");
    expect(names).not.toContain("OpenMeteoMCP-geocoding");
    expect(names).not.toContain("OpenMeteoMCP-weather_forecast");
    expect(names).toContain("AnumaMediaMCP-anuma_create_music");
  });
});

describe("findMatchingTools filterAmbiguous semantics", () => {
  // Direct coverage of the ambiguity-filter logic this PR turns on by default.
  const tools: ServerTool[] = [tool("a", [1, 0, 0, 0]), tool("b", [0, 1, 0, 0])];

  it("returns [] when top < 0.55 AND gap < 0.04", () => {
    // Uniform prompt → both tools score 0.5/0.9 ≈ 0.5, gap = 0.
    const prompt = [0.45, 0.45, 0.45, 0.45];
    const matches = findMatchingTools(prompt, tools, {
      filterAmbiguous: true,
      minSimilarity: 0.3,
    });
    expect(matches).toEqual([]);
  });

  it("keeps matches when top >= ambiguityThreshold (clear winner case)", () => {
    const matches = findMatchingTools([1, 0, 0, 0], tools, {
      filterAmbiguous: true,
      minSimilarity: 0.3,
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].tool.name).toBe("a");
  });
});
