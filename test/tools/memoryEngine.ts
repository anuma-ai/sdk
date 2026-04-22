/**
 * E2E test: memory_engine_search tool
 *
 * Uses a real in-memory WatermelonDB (LokiJSAdapter) and real Portal
 * embeddings to test conversation search through the LLM tool loop.
 *
 * Seeds a conversation with pre-embedded messages, then verifies the
 * LLM can find relevant past messages via semantic search.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createMemoryEngineTool } from "../../src/lib/memoryEngine/tool.js";
import { generateEmbedding } from "../../src/lib/memoryEngine/embeddings.js";
import { sdkSchema, sdkModelClasses } from "../../src/lib/db/schema.js";
import type { StorageOperationsContext } from "../../src/lib/db/chat/operations.js";
import type { Message } from "../../src/lib/db/chat/models.js";
import type { Conversation } from "../../src/lib/db/chat/models.js";
import type { EmbeddingOptions } from "../../src/lib/memoryEngine/types.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";

let database: Database;
let storageCtx: StorageOperationsContext;
let embeddingOptions: EmbeddingOptions;

const CONV_ID = "e2e-test-conv-1";

/** Seed messages that will be pre-embedded for search */
const seedMessages = [
  { role: "user", content: "I'm planning a trip to Japan next spring" },
  {
    role: "assistant",
    content: "That sounds wonderful! Spring is cherry blossom season in Japan.",
  },
  { role: "user", content: "My budget is about $5000 for two weeks" },
  { role: "user", content: "I'm allergic to shellfish, so I need to be careful with food" },
];

beforeAll(async () => {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    dbName: "e2e-memory-engine-test",
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  database = new Database({
    adapter,
    modelClasses: sdkModelClasses,
  });

  storageCtx = {
    database,
    messagesCollection: database.get<Message>("history"),
    conversationsCollection: database.get<Conversation>("conversations"),
  };

  embeddingOptions = {
    apiKey: config.portalKey,
    baseUrl: config.baseUrl,
  };

  // Generate real embeddings for seed messages
  const embeddings = await Promise.all(
    seedMessages.map((m) => generateEmbedding(m.content, embeddingOptions))
  );

  // Seed the database with a conversation and pre-embedded messages
  await database.write(async () => {
    await storageCtx.conversationsCollection.create((record) => {
      record._setRaw("conversation_id", CONV_ID);
      record._setRaw("title", "Japan trip planning");
      record._setRaw("is_deleted", false);
    });

    for (let i = 0; i < seedMessages.length; i++) {
      const msg = seedMessages[i];
      const embedding = embeddings[i];
      const chunk = {
        text: msg.content,
        vector: embedding,
        startOffset: 0,
        endOffset: msg.content.length,
      };

      await storageCtx.messagesCollection.create((record) => {
        record._setRaw("message_id", i + 1);
        record._setRaw("conversation_id", CONV_ID);
        record._setRaw("role", msg.role);
        record._setRaw("content", msg.content);
        record._setRaw("chunks", JSON.stringify([chunk]));
      });
    }
  });
});

afterAll(async () => {
  if (database) {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  }
});

describe("search_memory", () => {
  it("finds relevant past conversation messages via semantic search", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createMemoryEngineTool(storageCtx, embeddingOptions), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What food allergies did I mention in our previous conversations? Use the memory_engine_search tool to find out.",
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
    expect(log[0].name).toBe("search_memory");

    const toolResult = typeof log[0].result === "string" ? log[0].result : String(log[0].result);
    expect(toolResult.toLowerCase()).toContain("shellfish");
  });

  // TODO: re-enable — hits the 300s per-test timeout. Skipped to unblock CI in #446.
  it.skip("finds travel budget information from past conversations", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createMemoryEngineTool(storageCtx, embeddingOptions), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "How much money did I say I was budgeting for travel? Search my past conversations with the memory_engine_search tool.",
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
    expect(log[0].name).toBe("search_memory");

    const toolResult = typeof log[0].result === "string" ? log[0].result : String(log[0].result);
    expect(toolResult).toContain("5000");
  });
});
