import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../memoryEngine/generate")>();
  return { ...orig, generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]) };
});

import { generateEmbedding } from "../memoryEngine/generate";
import { selectServerToolsForPrompt, type ToolsCacheBackend } from "./serverTools";

const RESTAURANT_TOOLS = [
  "AnumaPaymentsMCP-anuma_find_restaurant",
  "AnumaPaymentsMCP-anuma_check_restaurant_availability",
  "AnumaPaymentsMCP-anuma_book_restaurant",
];
const CATALOG = ["AnumaJinaMCP-search_web", ...RESTAURANT_TOOLS];

// No cached catalog, so every call reads the stubbed /api/v1/tools response.
const noCache: ToolsCacheBackend = { get: () => null, set: () => {} };

// The semantic filter a follow-up like "Retry" gets: nothing in the booking chain scores.
const semanticMiss = vi.fn(() => ["AnumaJinaMCP-search_web"]);

function select(prompt: string, activeToolSets?: string[]) {
  return selectServerToolsForPrompt({
    prompt,
    serverToolsFilter: semanticMiss,
    getToken: async () => "tok",
    baseUrl: "https://portal.test",
    cache: noCache,
    activeToolSets,
  });
}

const names = (tools: { name: string }[]) => tools.map((t) => t.name);

describe("selectServerToolsForPrompt — activeToolSets", () => {
  beforeEach(() => {
    const body = Object.fromEntries(
      CATALOG.map((name) => [
        name,
        { name, description: `desc ${name}`, parameters: { type: "object", properties: {} } },
      ])
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("keeps the booking tools on a follow-up the filter misses when the set is active", async () => {
    expect(names(await select("Retry", ["restaurant-booking"]))).toEqual([
      "AnumaJinaMCP-search_web",
      ...RESTAURANT_TOOLS,
    ]);
  });

  it("selects from the prompt alone when no set is active", async () => {
    expect(names(await select("Retry"))).toEqual(["AnumaJinaMCP-search_web"]);
  });

  it("keeps the booking tools below the short-prompt gate, without embedding", async () => {
    expect(names(await select("okay", ["restaurant-booking"]))).toEqual(RESTAURANT_TOOLS);
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(semanticMiss).not.toHaveBeenCalled();
  });

  it("selects nothing below the short-prompt gate when no set is active", async () => {
    expect(await select("okay")).toEqual([]);
  });

  it("keeps the booking tools when the prompt embedding fails", async () => {
    vi.mocked(generateEmbedding).mockRejectedValueOnce(new Error("embeddings down"));
    expect(names(await select("same as before", ["restaurant-booking"]))).toEqual(RESTAURANT_TOOLS);
  });
});
