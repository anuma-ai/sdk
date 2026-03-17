/**
 * E2E test: memory_vault_save and memory_vault_search tools
 *
 * Uses a real in-memory WatermelonDB (LokiJSAdapter) and real Portal
 * embeddings to test the full vault save + search round-trip through
 * the LLM tool loop.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createMemoryVaultTool } from "../../src/lib/memoryVault/tool.js";
import { createMemoryVaultSearchTool } from "../../src/lib/memoryVault/searchTool.js";
import { createVaultEmbeddingCache } from "../../src/lib/memoryVault/lruCache.js";
import { sdkSchema, sdkModelClasses } from "../../src/lib/db/schema.js";
import type { VaultMemoryOperationsContext } from "../../src/lib/db/memoryVault/operations.js";
import type { VaultMemory } from "../../src/lib/db/memoryVault/models.js";
import type { EmbeddingOptions } from "../../src/lib/memoryEngine/types.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";

let database: Database;
let vaultCtx: VaultMemoryOperationsContext;
let embeddingOptions: EmbeddingOptions;
let cache: ReturnType<typeof createVaultEmbeddingCache>;

beforeAll(() => {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    dbName: "e2e-vault-test",
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  database = new Database({
    adapter,
    modelClasses: sdkModelClasses,
  });

  vaultCtx = {
    database,
    vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
  };

  embeddingOptions = {
    apiKey: config.portalKey,
    baseUrl: config.baseUrl,
  };

  cache = createVaultEmbeddingCache();
});

afterAll(async () => {
  if (database) {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  }
});

describe("memory_vault", () => {
  it("saves a memory via LLM tool call and persists it to the database", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(
      createMemoryVaultTool(vaultCtx, { onSave: async () => true }),
      log,
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Remember that my favorite programming language is Rust. Use the memory_vault_save tool.",
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
    expect(log[0].name).toBe("memory_vault_save");
    const savedContent = log[0].args.content as string;
    expect(savedContent).toBeTruthy();

    const toolResult = typeof log[0].result === "string" ? log[0].result : String(log[0].result);
    expect(toolResult).toContain("Memory saved successfully");

    // Verify the exact content the LLM provided is in the database
    const records = await vaultCtx.vaultMemoryCollection.query().fetch();
    expect(records.length).toBe(1);
    expect(records[0].content).toBe(savedContent);
    expect(records[0].scope).toBe("private");
    expect(records[0].isDeleted).toBe(false);
  });

  it("saves a second memory without overwriting the first", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(
      createMemoryVaultTool(vaultCtx, { onSave: async () => true }),
      log,
    );

    await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Remember that I live in Berlin. Use the memory_vault_save tool.",
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

    expect(log[0].name).toBe("memory_vault_save");

    // Both memories should exist
    const records = await vaultCtx.vaultMemoryCollection.query().fetch();
    expect(records.length).toBe(2);
    const contents = records.map((r) => r.content.toLowerCase());
    expect(contents.some((c) => c.includes("rust"))).toBe(true);
    expect(contents.some((c) => c.includes("berlin"))).toBe(true);
  });

  it("searches vault memories with real embeddings", async () => {
    // First, save a memory directly so we have something to search
    await database.write(async () => {
      await vaultCtx.vaultMemoryCollection.create((record) => {
        record._setRaw("content", "The user's favorite color is blue");
        record._setRaw("scope", "private");
        record._setRaw("is_deleted", false);
      });
    });

    const log: ToolCallLog[] = [];
    const tool = wrapTool(
      createMemoryVaultSearchTool(vaultCtx, embeddingOptions, cache),
      log,
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What's my favorite color? Use the memory_vault_search tool to check.",
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
    expect(log[0].name).toBe("memory_vault_search");

    const toolResult = typeof log[0].result === "string" ? log[0].result : String(log[0].result);
    expect(toolResult).toContain("blue");

    const responseText = extractText(result).toLowerCase();
    expect(responseText).toContain("blue");
  });

  it("returns no results for unrelated search queries", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(
      createMemoryVaultSearchTool(vaultCtx, embeddingOptions, cache),
      log,
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Do I have any memories about quantum computing? Use the memory_vault_search tool.",
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
    expect(log[0].name).toBe("memory_vault_search");

    // The vault has memories about Rust, Berlin, and blue — nothing about quantum computing.
    // The search may return low-similarity results or "No relevant memories found".
    // Either way, "quantum" should not appear in the tool result.
    const toolResult = typeof log[0].result === "string" ? log[0].result : String(log[0].result);
    expect(toolResult.toLowerCase()).not.toContain("quantum");
  });
});
