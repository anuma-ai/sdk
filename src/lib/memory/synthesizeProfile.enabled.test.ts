import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../memoryEngine/embeddings", () => {
  const DIM = 64;
  const embed = (text: string): number[] => {
    const v: number[] = new Array<number>(DIM).fill(0);
    for (const token of text.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
      v[hash % DIM] += 1;
    }
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  };
  return {
    generateEmbedding: vi.fn((text: string) => Promise.resolve(embed(text))),
    generateEmbeddings: vi.fn((texts: string[]) => Promise.resolve(texts.map(embed))),
  };
});
vi.mock("./reflect.js", () => ({ reflect: vi.fn() }));

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { reflect } from "./reflect.js";
import { createLocalMemoryStore } from "./store/local";
import { type ProfileFacet, synthesizeProfile } from "./synthesizeProfile";
import type { RankedMemory } from "./types";

const embeddingOptions = { apiKey: "test-key" };
const facets: ProfileFacet[] = [
  { key: "work_role", label: "Work & Role", query: "where does the user work", guidance: "g" },
];

describe("synthesizeProfile with a switched-off memory", () => {
  it("rebuilds the section and leaves the memory out", async () => {
    vi.mocked(reflect).mockImplementation(async (_query, _ctx, options) => {
      const memories = (options as { memories: RankedMemory[] }).memories;
      return {
        text: "work",
        structuredOutput: { summary: memories.map((m) => m.content).join("; "), hasEvidence: true },
        basedOn: { memoryIds: memories.map((m) => m.id) },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      } as Awaited<ReturnType<typeof reflect>>;
    });
    const store = createLocalMemoryStore({
      database: new Database({
        adapter: new LokiJSAdapter({
          schema: sdkSchema,
          migrations: sdkMigrations,
          useWebWorker: false,
          useIncrementalIndexedDB: false,
          dbName: `profile-enabled-${Math.random().toString(36).slice(2)}`,
        }),
        modelClasses: sdkModelClasses,
      }),
      embeddingOptions,
      singleTenant: true,
    });
    const job = await store.retain("The user does work at Anuma as an engineer");
    await store.retain("The user does work on weekends at a bakery");

    const first = await synthesizeProfile({ embeddingOptions }, { apiKey: "k", facets, store });
    expect(first.sections[0].sourceMemoryIds).toContain(job.memoryId);

    const later = Date.now() + 1000;
    const clock = vi.spyOn(Date, "now").mockReturnValue(later);
    try {
      await store.setEnabled!(job.memoryId, false);
    } finally {
      clock.mockRestore();
    }
    vi.mocked(reflect).mockClear();
    const second = await synthesizeProfile(
      { embeddingOptions },
      { apiKey: "k", facets, store, previous: first }
    );

    expect(reflect).toHaveBeenCalledTimes(1);
    expect(second.sections[0].sourceMemoryIds).not.toContain(job.memoryId);
    expect(second.sections[0].sourceMemoryIds.length).toBeGreaterThan(0);
  });
});
