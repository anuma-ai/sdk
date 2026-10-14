import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = resolve(process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url)));
const packageRequire = createRequire(resolve(packageRoot, "package.json"));
const react = packageRequire("@anuma/sdk/react");
const expo = packageRequire("@anuma/sdk/expo");
const server = packageRequire("@anuma/sdk/server");
const { Database } = require("@nozbe/watermelondb");
const LokiJSAdapter = require("@nozbe/watermelondb/adapters/lokijs").default;
const QUERY = "Drinks tea";
const VECTOR = [1, 0, 0, 0];
const OTHER_VECTOR = [0, 1, 0];
const originalFetch = globalThis.fetch;
react.setLogger(react.noopLogger);

async function setup(masked = false) {
  const requests = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    assert.equal(new URL(request.url).pathname, "/api/v1/embeddings");
    const body = await request.json();
    requests.push(body);
    await new Promise((resolveRequest) => setTimeout(resolveRequest, 5));
    return new Response(
      JSON.stringify({
        data: [{ embedding: body.model === "other-model" ? OTHER_VECTOR : VECTOR }],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  };
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: react.sdkSchema,
      migrations: react.sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `embedding-entrypoints-${Math.random()}`,
    }),
    modelClasses: react.sdkModelClasses,
  });
  const embeddingOptions = {
    apiKey: "test-key",
    baseUrl: "https://portal.example",
    model: "test-model",
    ...(masked && { maskInput: () => "[MASKED]" }),
  };
  const store = react.createLocalMemoryStore({ database, embeddingOptions, singleTenant: true });
  const fact = await store.create({
    content: QUERY,
    embedding: JSON.stringify(VECTOR),
    embeddingModel: embeddingOptions.model,
  });
  await database.write(async () => {
    await database.get("conversations").create((conversation) => {
      conversation.conversationId = "earlier-conversation";
      conversation.title = "Tea";
      conversation.isDeleted = false;
      conversation.createdAt = new Date();
      conversation.updatedAt = new Date();
    });
    await database.get("history").create((message) => {
      message.conversationId = "earlier-conversation";
      message.messageId = 1;
      message.role = "user";
      message.content = "Previously discussed tea";
      message.createdAt = new Date();
      message.updatedAt = new Date();
      message.chunks = [{ vector: VECTOR, startOffset: 0, endOffset: message.content.length }];
    });
  });
  return {
    requests,
    fact,
    embeddingOptions,
    ctx: {
      factSource: store.factSource,
      embeddingOptions,
      storageCtx: {
        database,
        messagesCollection: database.get("history"),
        conversationsCollection: database.get("conversations"),
      },
    },
  };
}

const failures = [];
const check = async (name, run) => {
  try {
    await run();
    console.log(`PASS: ${name}`);
  } catch (error) {
    failures.push(error);
    console.error(`FAIL: ${name}: ${error.message}`);
  }
};

try {
  for (const masked of [false, true]) {
    await check(`React facts + Expo chunks + Server embedding (masked=${masked})`, async () => {
      const { ctx, requests, fact, embeddingOptions } = await setup(masked);
      for (let turn = 1; turn <= 2; turn++) {
        const embeddingCache = new Map();
        const [facts, chunks, vector] = await Promise.all([
          expo.recall(QUERY, ctx, { types: ["fact"], embeddingCache }),
          expo.recall(QUERY, ctx, { types: ["chunk"], embeddingCache }),
          server.generateEmbedding(QUERY, {
            ...embeddingOptions,
            cache: expo.maskScopedEmbeddingCache(embeddingCache, masked),
          }),
        ]);
        assert.equal(facts.memories[0]?.id, fact.uniqueId);
        assert.equal(chunks.memories.length, 1);
        assert.deepEqual(vector, VECTOR);
        assert.equal(requests.length, turn, "matching embeddings must make one request per turn");
        assert.equal(requests.at(-1).input, masked ? "[MASKED]" : QUERY);
        assert.equal(
          react.maskScopedEmbeddingCache(embeddingCache, masked),
          expo.maskScopedEmbeddingCache(embeddingCache, masked),
          "entrypoints must return the same scoped view"
        );
      }
    });
  }
  for (const [name, caller] of [
    ["Expo", expo],
    ["Server", server],
  ]) {
    await check(`React model provenance reaches ${name}`, async () => {
      const { ctx, requests, embeddingOptions } = await setup();
      const embeddingCache = new Map();
      await expo.recall(QUERY, ctx, { types: ["fact"], embeddingCache });
      for (let repeat = 0; repeat < 2; repeat++) {
        const vector = await caller.generateEmbedding(QUERY, {
          ...embeddingOptions,
          model: "other-model",
          cache: expo.maskScopedEmbeddingCache(embeddingCache, false),
        });
        assert.deepEqual(vector, OTHER_VECTOR);
      }
      assert.equal(requests.length, 2);
      const recalled = await expo.recall(QUERY, ctx, { types: ["fact"], embeddingCache });
      assert.equal(recalled.memories.length, 1);
      assert.equal(requests.length, 3);
    });
  }
} finally {
  globalThis.fetch = originalFetch;
}

process.exit(failures.length ? 1 : 0);
