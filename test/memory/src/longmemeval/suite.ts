/**
 * LongMemEval Benchmark Suite
 *
 * Core evaluation logic for the LongMemEval benchmark.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  sdkSchema,
  sdkMigrations,
  sdkModelClasses,
} from "../../../../src/lib/db/schema.js";
import {
  searchSimilarMemoriesOp,
  saveMemoryOp,
  clearAllMemoriesOp,
} from "../../../../src/lib/db/memory/operations.js";
import { cosineSimilarity } from "../../../../src/lib/db/memory/types.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../../src/lib/memory/constants.js";
import type {
  LongMemEvalEntry,
  LongMemEvalSession,
  LongMemEvalResult,
  LongMemEvalSummary,
  LongMemEvalOptions,
  LongMemEvalQuestionType,
  LongMemEvalChunkEmbeddingsCache,
} from "./types.js";
import { calculatePercentiles } from "../metrics.js";
import { getCacheDirectory } from "./dataset.js";

declare const global: typeof globalThis;
declare const require: any;

// Silence WatermelonDB/LokiJS emoji logs
const originalLog = console.log;
const originalWarn = console.warn;
console.log = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("[🍉]")) return;
  originalLog(...args);
};
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("[🍉]")) return;
  originalWarn(...args);
};

interface ExtractedMemory {
  sessionIndex: number;
  sessionId: string;
  type: "identity" | "preference" | "project" | "skill" | "constraint";
  namespace: string;
  key: string;
  value: string;
  rawEvidence: string;
  confidence: number;
  embedding?: number[];
}

interface SessionChunk {
  sessionIndex: number;
  sessionId: string;
  messageIndex: number;
  role: "user" | "assistant";
  content: string;
  contentHash: string;
  timestamp?: string;
  embedding?: number[];
}

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  llmModel: string;
}

async function setupDatabase(): Promise<Database> {
  if (!global.crypto) {
    const { webcrypto } = require("node:crypto");
    Object.defineProperty(global, "crypto", {
      value: webcrypto as Crypto,
      writable: true,
      configurable: true,
    });
  }

  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    dbName: `longmemeval-${Date.now()}`,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  return new Database({
    adapter,
    modelClasses: sdkModelClasses,
  });
}

/**
 * Try to extract JSON from a string that might contain markdown or other text
 */
function extractJsonFromResponse(content: string): string {
  let jsonStr = content.trim();

  // Handle markdown code blocks
  if (jsonStr.includes("```")) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }
  }

  // Try to find JSON object in the response
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  return jsonStr;
}

function safeModelName(model: string): string {
  return model.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

function getChunkCachePath(variant: "s" | "m", model: string): string {
  const filename = `longmemeval_chunk_embeddings_${variant}_${safeModelName(
    model
  )}.json`;
  return join(getCacheDirectory(), filename);
}

function getTranscriptPath(questionId: string): string {
  return join(getCacheDirectory(), "transcripts", `${questionId}.json`);
}

async function transcriptMatchesModel(
  questionId: string,
  model: string
): Promise<boolean> {
  try {
    const data = await readFile(getTranscriptPath(questionId), "utf-8");
    const parsed = JSON.parse(data) as { llmModel?: string };
    return parsed.llmModel === model;
  } catch {
    return false;
  }
}

async function loadChunkEmbeddingCache(
  variant: "s" | "m",
  model: string
): Promise<LongMemEvalChunkEmbeddingsCache> {
  const cachePath = getChunkCachePath(variant, model);

  try {
    const data = await readFile(cachePath, "utf-8");
    const parsed = JSON.parse(data) as LongMemEvalChunkEmbeddingsCache;

    if (parsed.model !== model || parsed.variant !== variant) {
      return {
        version: "1",
        model,
        variant,
        entries: {},
      };
    }

    return parsed;
  } catch {
    return {
      version: "1",
      model,
      variant,
      entries: {},
    };
  }
}

async function saveChunkEmbeddingCache(
  cache: LongMemEvalChunkEmbeddingsCache
): Promise<void> {
  const cachePath = getChunkCachePath(cache.variant, cache.model);
  await writeFile(cachePath, JSON.stringify(cache));
}

function hashChunkContent(role: "user" | "assistant", content: string): string {
  return createHash("sha1").update(`${role}|${content}`).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseLongMemEvalTimestamp(value?: string): number {
  if (!value) return Number.NaN;
  const cleaned = value.replace(/\s*\([^)]+\)\s*/, " ");
  const date = new Date(cleaned);
  const ts = date.getTime();
  return Number.isNaN(ts) ? Number.NaN : ts;
}

/**
 * Extract memories from a chat session using the LLM
 */
async function extractMemoriesFromSession(
  session: LongMemEvalSession,
  sessionIndex: number,
  sessionId: string,
  api: ApiConfig
): Promise<ExtractedMemory[]> {
  const conversationText = session
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  const extractionPrompt = `You are a memory extraction system. Extract durable user memories from this chat conversation.

CRITICAL: Respond with ONLY valid JSON. No explanations, no markdown, just pure JSON.

Only extract clear, factual statements about the user that might be relevant for future conversations.
Focus on: identity facts, preferences, projects, skills, constraints, and personal information.

Conversation:
${conversationText}

Response format:
{
  "items": [
    {
      "type": "identity|preference|project|skill|constraint",
      "namespace": "category",
      "key": "attribute_name",
      "value": "the value",
      "rawEvidence": "exact quote from conversation",
      "confidence": 0.0-1.0
    }
  ]
}

If no memories to extract, return: {"items": []}`;

  try {
    const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": api.apiKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content || "{}";

    // Parse JSON with robust extraction
    const jsonStr = extractJsonFromResponse(content);

    const parsed = JSON.parse(jsonStr) as {
      items: Array<{
        type: string;
        namespace: string;
        key: string;
        value: string;
        rawEvidence: string;
        confidence: number;
      }>;
    };

    return (parsed.items || []).map((item) => ({
      sessionIndex,
      sessionId,
      type: item.type as ExtractedMemory["type"],
      namespace: item.namespace || "general",
      key: item.key || "unknown",
      value: item.value || "",
      rawEvidence: item.rawEvidence || "",
      confidence: item.confidence || 0.5,
    }));
  } catch {
    // Silently skip sessions that fail to parse - this is expected for some
    return [];
  }
}

/**
 * Generate embeddings for texts
 */
async function generateEmbeddings(
  texts: string[],
  api: ApiConfig
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": api.apiKey,
        },
        body: JSON.stringify({
          model: DEFAULT_API_EMBEDDING_MODEL,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      embeddings.push(data.data[0].embedding);
    } catch (error) {
      console.error("Embedding generation failed:", error);
      embeddings.push([]);
    }
  }

  return embeddings;
}

async function generateEmbeddingsBatch(
  texts: string[],
  api: ApiConfig
): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const response = await fetch(`${api.baseUrl}/api/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": api.apiKey,
      },
      body: JSON.stringify({
        model: DEFAULT_API_EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data.map((item) => item.embedding);
  } catch (error) {
    console.error("Batch embedding generation failed:", error);
    return texts.map(() => []);
  }
}

/**
 * Answer a question using retrieved memories
 */
async function answerQuestion(
  question: string,
  memories: Array<{ value: string; rawEvidence: string; similarity: number }>,
  api: ApiConfig
): Promise<string> {
  const memoryContext = memories
    .map(
      (m, i) =>
        `[${i + 1}] ${m.value} (relevance: ${m.similarity.toFixed(
          2
        )})\n    Evidence: "${m.rawEvidence}"`
    )
    .join("\n");

  const prompt = `Based on the following memories about the user, answer their question concisely.

User Memories:
${memoryContext || "(No relevant memories found)"}

Question: ${question}

Answer the question directly based on the memories above. If the information is not available in the memories, say "I don't have that information."
Keep your answer brief and factual.`;

  try {
    const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": api.apiKey,
      },
      body: JSON.stringify({
        model: api.llmModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Answer generation failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating answer:", error);
    return "";
  }
}

const CHUNK_TOOL_NAME = "search_past_conversation_chunks";

function createChunkSearchTool(): {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} {
  return {
    type: "function",
    function: {
      name: CHUNK_TOOL_NAME,
      description:
        "Search past conversation chunks semantically. Defaults to user chunks; set include_assistant true only if the question refers to assistant replies.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "User question to match against past chunks.",
          },
          include_assistant: {
            type: "boolean",
            description:
              "Whether to include assistant chunks in search (default false).",
          },
          top_k: {
            type: "integer",
            description: "Number of chunks to return (default 8).",
          },
          start_date: {
            type: "string",
            description:
              "Optional inclusive start date/time in dataset format (e.g. 2023/05/30 (Tue) 01:50).",
          },
          end_date: {
            type: "string",
            description:
              "Optional inclusive end date/time in dataset format (e.g. 2023/05/30 (Tue) 01:50).",
          },
        },
        required: ["query"],
      },
    },
  };
}

async function callChatCompletion(
  api: ApiConfig,
  messages: Array<{ role: string; content?: string; tool_calls?: any }>,
  options?: {
    tools?: Array<{ type: "function"; function: any }>;
    toolChoice?: string;
    maxTokens?: number;
  }
): Promise<{
  content: string;
  toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }>;
}> {
  const maxAttempts = 3;
  let lastStatus: number | null = null;
  let lastError: unknown;
  let emptyRetryUsed = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const payload: Record<string, unknown> = {
        model: api.llmModel,
        messages,
        temperature: 0,
        max_tokens: options?.maxTokens ?? 500,
      };

      if (options?.tools && options.tools.length > 0) {
        payload.tools = options.tools;
        if (options?.toolChoice) {
          payload.tool_choice = options.toolChoice;
        }
      } else if (options?.toolChoice) {
        payload.tools = [];
        payload.tool_choice = options.toolChoice;
      }

      const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": api.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        lastStatus = response.status;
        if (attempt < maxAttempts) {
          await sleep(250 * attempt);
          continue;
        }
        throw new Error(`Chat completion failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content?: string;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
        }>;
      };

      const message = data.choices[0]?.message;
      const toolCalls =
        options?.tools && options.tools.length > 0 ? message?.tool_calls : undefined;
      const content = message?.content || "";

      if (!content && !toolCalls && !emptyRetryUsed && attempt < maxAttempts) {
        emptyRetryUsed = true;
        await sleep(250 * attempt);
        continue;
      }

      return {
        content,
        toolCalls,
      };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(250 * attempt);
        continue;
      }
    }
  }

  if (lastStatus !== null) {
    throw new Error(`Chat completion failed: ${lastStatus}`);
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Chat completion failed");
}

/**
 * Evaluate if the generated answer matches the expected answer
 */
async function evaluateAnswer(
  question: string,
  expectedAnswer: string,
  generatedAnswer: string,
  api: ApiConfig
): Promise<boolean> {
  const prompt = `You are an answer evaluator. Determine if the generated answer correctly answers the question, matching the expected answer's meaning.

Question: ${question}
Expected Answer: ${expectedAnswer}
Generated Answer: ${generatedAnswer}

Does the generated answer correctly capture the same information as the expected answer?
Consider partial matches as correct if the key information is present.

Respond with ONLY "CORRECT" or "INCORRECT".`;

  try {
    const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": api.apiKey,
      },
      body: JSON.stringify({
        model: api.llmModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const result =
      data.choices[0]?.message?.content?.trim().toUpperCase() || "";
    return result.includes("CORRECT") && !result.includes("INCORRECT");
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return false;
  }
}

/**
 * Log progress inline (overwrites current line)
 */
function logProgress(message: string): void {
  if (process.stdout.isTTY) {
    process.stdout.write(`\r  ${message.padEnd(60)}`);
  }
}

/**
 * Clear progress line
 */
function clearProgress(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\r" + " ".repeat(65) + "\r");
  }
}

/**
 * Select sessions to process, prioritizing answer sessions when limiting
 */
function selectSessions(
  entry: LongMemEvalEntry,
  maxSessions?: number
): { indices: number[]; limited: boolean } {
  const totalAvailable = entry.haystack_sessions.length;

  if (!maxSessions || maxSessions >= totalAvailable) {
    return {
      indices: Array.from({ length: totalAvailable }, (_, i) => i),
      limited: false,
    };
  }

  // Find indices of answer sessions
  const answerSessionIndices = new Set<number>();
  for (const answerId of entry.answer_session_ids) {
    const idx = entry.haystack_session_ids.indexOf(answerId);
    if (idx !== -1) {
      answerSessionIndices.add(idx);
    }
  }

  // Always include answer sessions, fill rest with other sessions
  const selected = new Set<number>(answerSessionIndices);
  for (let i = 0; i < totalAvailable && selected.size < maxSessions; i++) {
    selected.add(i);
  }

  return {
    indices: Array.from(selected).sort((a, b) => a - b),
    limited: true,
  };
}

function buildChunks(
  entry: LongMemEvalEntry,
  sessionIndices: number[]
): SessionChunk[] {
  const chunks: SessionChunk[] = [];

  for (const sessionIndex of sessionIndices) {
    const session = entry.haystack_sessions[sessionIndex];
    const sessionId = entry.haystack_session_ids[sessionIndex];

    for (let messageIndex = 0; messageIndex < session.length; messageIndex++) {
      const message = session[messageIndex];
      const contentHash = hashChunkContent(message.role, message.content);
      chunks.push({
        sessionIndex,
        sessionId,
        messageIndex,
        role: message.role,
        content: message.content,
        contentHash,
        timestamp: entry.haystack_dates[sessionIndex],
      });
    }
  }

  return chunks;
}

function indexCachedChunks(
  entryCache?: LongMemEvalChunkEmbeddingsCache["entries"][string]
): Map<string, number[]> {
  const map = new Map<string, number[]>();

  if (!entryCache) return map;

  for (const chunk of entryCache.chunks) {
    const key = `${chunk.sessionIndex}:${chunk.messageIndex}:${chunk.role}:${chunk.contentHash}`;
    map.set(key, chunk.embedding);
  }

  return map;
}

function searchChunks(
  chunks: SessionChunk[],
  queryEmbedding: number[],
  topK: number,
  includeAssistant: boolean,
  startDate?: string,
  endDate?: string
): Array<SessionChunk & { similarity: number }> {
  let filtered = chunks.filter((chunk) => {
    if (includeAssistant) return true;
    return chunk.role === "user";
  });

  if (startDate || endDate) {
    const startTs = startDate ? parseLongMemEvalTimestamp(startDate) : Number.NaN;
    const endTs = endDate ? parseLongMemEvalTimestamp(endDate) : Number.NaN;
    filtered = filtered.filter((chunk) => {
      const chunkTs = parseLongMemEvalTimestamp(chunk.timestamp);
      if (Number.isNaN(chunkTs)) return false;
      if (!Number.isNaN(startTs) && chunkTs < startTs) return false;
      if (!Number.isNaN(endTs) && chunkTs > endTs) return false;
      return true;
    });
  }

  const scored = filtered
    .filter((chunk) => chunk.embedding && chunk.embedding.length > 0)
    .map((chunk) => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding!),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

async function populateChunkEmbeddings(
  entry: LongMemEvalEntry,
  sessionIndices: number[],
  api: ApiConfig,
  cache: LongMemEvalChunkEmbeddingsCache
): Promise<SessionChunk[]> {
  const chunks = buildChunks(entry, sessionIndices);
  const entryId = entry.question_id;
  const entryCache = cache.entries[entryId];
  const cachedIndex = indexCachedChunks(entryCache);

  const missingTexts: string[] = [];
  const missingChunks: SessionChunk[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.sessionIndex}:${chunk.messageIndex}:${chunk.role}:${chunk.contentHash}`;
    const cachedEmbedding = cachedIndex.get(key);
    if (cachedEmbedding && cachedEmbedding.length > 0) {
      chunk.embedding = cachedEmbedding;
    } else {
      missingChunks.push(chunk);
      missingTexts.push(`${chunk.role}: ${chunk.content}`);
    }
  }

  const BATCH_SIZE = 96;
  for (let i = 0; i < missingTexts.length; i += BATCH_SIZE) {
    const batchTexts = missingTexts.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = await generateEmbeddingsBatch(batchTexts, api);
    for (let j = 0; j < batchEmbeddings.length; j++) {
      const chunk = missingChunks[i + j];
      if (!chunk) continue;
      chunk.embedding = batchEmbeddings[j];
    }
  }

  const updatedChunkMap = new Map<
    string,
    LongMemEvalChunkEmbeddingsCache["entries"][string]["chunks"][number]
  >();

  if (entryCache) {
    for (const cached of entryCache.chunks) {
      const key = `${cached.sessionIndex}:${cached.messageIndex}:${cached.role}:${cached.contentHash}`;
      updatedChunkMap.set(key, cached);
    }
  }

  for (const chunk of chunks) {
    if (!chunk.embedding || chunk.embedding.length === 0) continue;
    const key = `${chunk.sessionIndex}:${chunk.messageIndex}:${chunk.role}:${chunk.contentHash}`;
    updatedChunkMap.set(key, {
      sessionIndex: chunk.sessionIndex,
      messageIndex: chunk.messageIndex,
      role: chunk.role,
      contentHash: chunk.contentHash,
      embedding: chunk.embedding,
    });
  }

  cache.entries[entryId] = {
    chunks: Array.from(updatedChunkMap.values()),
  };

  return chunks;
}

/**
 * Process a single LongMemEval entry
 */
async function processEntry(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number
): Promise<LongMemEvalResult> {
  const startTime = performance.now();

  const { indices: sessionIndices, limited } = selectSessions(entry, maxSessions);
  const totalSessions = sessionIndices.length;

  if (verbose) {
    console.log(`\n  Processing: ${entry.question_id}`);
    console.log(`  Type: ${entry.question_type}`);
    const sessionInfo = limited
      ? `${totalSessions}/${entry.haystack_sessions.length} (limited, includes answer sessions)`
      : `${totalSessions}`;
    console.log(`  Sessions: ${sessionInfo}`);
    console.log(`  Question: ${entry.question}`);
  }

  // Set up a fresh database for this entry
  logProgress("Setting up database...");
  const database = await setupDatabase();
  const ctx = {
    database,
    memoriesCollection: database.collections.get("memories"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as any;

  try {
    await clearAllMemoriesOp(ctx);

    // Extract memories from selected sessions
    const allMemories: ExtractedMemory[] = [];

    for (let i = 0; i < sessionIndices.length; i++) {
      const sessionIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sessionIdx];
      const sessionId = entry.haystack_session_ids[sessionIdx];

      logProgress(`Extracting memories: ${i + 1}/${totalSessions} sessions`);

      const sessionMemories = await extractMemoriesFromSession(
        session,
        sessionIdx,
        sessionId,
        api
      );
      allMemories.push(...sessionMemories);

      if (verbose && sessionMemories.length > 0) {
        clearProgress();
        console.log(`    Session ${sessionIdx}: ${sessionMemories.length} memories`);
      }
    }

    clearProgress();
    if (verbose) {
      console.log(`  Total memories extracted: ${allMemories.length}`);
    }

    // Generate embeddings for all memories
    if (allMemories.length > 0) {
      logProgress(`Generating embeddings: 0/${allMemories.length}`);
      const memoryTexts = allMemories.map(
        (m) => `${m.key}: ${m.value}. ${m.rawEvidence}`
      );

      const memoryEmbeddings: number[][] = [];
      for (let i = 0; i < memoryTexts.length; i++) {
        logProgress(`Generating embeddings: ${i + 1}/${memoryTexts.length}`);
        const [embedding] = await generateEmbeddings([memoryTexts[i]], api);
        memoryEmbeddings.push(embedding);
      }

      clearProgress();

      // Store memories in database
      const memoryToSession = new Map<string, string>();
      const answerSessionIdSet = new Set(entry.answer_session_ids);
      logProgress(`Storing ${allMemories.length} memories...`);

      for (let i = 0; i < allMemories.length; i++) {
        const memory = allMemories[i];
        const embedding = memoryEmbeddings[i];

        if (!embedding || embedding.length === 0) continue;

        const uniqueKey = `${memory.namespace}:${memory.key}:${memory.value}`;
        // Preserve answer session attribution for duplicate memories
        const existingSessionId = memoryToSession.get(uniqueKey);
        if (!existingSessionId || answerSessionIdSet.has(memory.sessionId)) {
          memoryToSession.set(uniqueKey, memory.sessionId);
        }

        await saveMemoryOp(ctx, {
          type: memory.type,
          namespace: memory.namespace,
          key: memory.key,
          value: memory.value,
          rawEvidence: memory.rawEvidence,
          confidence: memory.confidence,
          pii: false,
          embedding,
          embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
        });
      }

      clearProgress();

      // Generate query embedding
      logProgress("Generating query embedding...");
      const [queryEmbedding] = await generateEmbeddings([entry.question], api);
      clearProgress();

      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error("Failed to generate query embedding");
      }

      // Search for relevant memories
      logProgress("Searching memories...");
      const searchResults = await searchSimilarMemoriesOp(
        ctx,
        queryEmbedding,
        10,
        0.1
      );
      clearProgress();

      // Get session IDs of retrieved memories
      const retrievedSessionIds = new Set<string>();
      for (const result of searchResults) {
        const sessionId = memoryToSession.get(result.uniqueKey);
        if (sessionId) {
          retrievedSessionIds.add(sessionId);
        }
      }

      // Calculate retrieval metrics
      const expectedSessionIds = new Set(entry.answer_session_ids);
      const correctlyRetrieved = [...retrievedSessionIds].filter((id) =>
        expectedSessionIds.has(id)
      ).length;

      const retrievalPrecision =
        retrievedSessionIds.size > 0
          ? correctlyRetrieved / retrievedSessionIds.size
          : 0;
      const retrievalRecall =
        expectedSessionIds.size > 0
          ? correctlyRetrieved / expectedSessionIds.size
          : 0;

      // Generate answer
      logProgress("Generating answer...");
      const memoriesForAnswer = searchResults.map((r) => ({
        value: r.value,
        rawEvidence: r.rawEvidence,
        similarity: r.similarity,
      }));
      const generatedAnswer = await answerQuestion(
        entry.question,
        memoriesForAnswer,
        api
      );
      clearProgress();

      // Evaluate answer
      logProgress("Evaluating answer...");
      const isCorrect = await evaluateAnswer(
        entry.question,
        entry.answer,
        generatedAnswer,
        api
      );
      clearProgress();

      const elapsed = performance.now() - startTime;

      if (verbose) {
        console.log(`  Answer: ${generatedAnswer.slice(0, 100)}...`);
        console.log(`  Expected: ${entry.answer}`);
        console.log(`  Correct: ${isCorrect}`);
        console.log(`  Time: ${elapsed.toFixed(0)}ms`);
      }

      return {
        questionId: entry.question_id,
        questionType: entry.question_type,
        question: entry.question,
        expectedAnswer: entry.answer,
        generatedAnswer,
        isCorrect,
        retrievedSessionIds: [...retrievedSessionIds],
        expectedSessionIds: entry.answer_session_ids,
        retrievalPrecision,
        retrievalRecall,
        latencyMs: elapsed,
      };
    }

    // No memories extracted - still try to answer
    clearProgress();
    logProgress("Generating answer (no memories)...");
    const generatedAnswer = await answerQuestion(entry.question, [], api);
    clearProgress();

    logProgress("Evaluating answer...");
    const isCorrect = await evaluateAnswer(
      entry.question,
      entry.answer,
      generatedAnswer,
      api
    );
    clearProgress();

    const elapsed = performance.now() - startTime;

    return {
      questionId: entry.question_id,
      questionType: entry.question_type,
      question: entry.question,
      expectedAnswer: entry.answer,
      generatedAnswer,
      isCorrect,
      retrievedSessionIds: [],
      expectedSessionIds: entry.answer_session_ids,
      retrievalPrecision: 0,
      retrievalRecall: 0,
      latencyMs: elapsed,
    };
  } finally {
    try {
      await clearAllMemoriesOp(ctx);
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function processEntryChunked(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  cache: LongMemEvalChunkEmbeddingsCache,
  verbose: boolean,
  maxSessions?: number
): Promise<LongMemEvalResult> {
  const startTime = performance.now();

  const { indices: sessionIndices, limited } = selectSessions(entry, maxSessions);
  const totalSessions = sessionIndices.length;

  if (verbose) {
    console.log(`\n  Processing: ${entry.question_id}`);
    console.log(`  Type: ${entry.question_type}`);
    const sessionInfo = limited
      ? `${totalSessions}/${entry.haystack_sessions.length} (limited, includes answer sessions)`
      : `${totalSessions}`;
    console.log(`  Sessions: ${sessionInfo}`);
    console.log(`  Question: ${entry.question}`);
  }

  logProgress("Preparing chunks...");
  const chunks = await populateChunkEmbeddings(entry, sessionIndices, api, cache);
  clearProgress();

  logProgress("Generating query embedding...");
  const [queryEmbedding] = await generateEmbeddings([entry.question], api);
  clearProgress();

  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Failed to generate query embedding");
  }

  const tool = createChunkSearchTool();
  const systemPrompt = `You are a memory assistant. Your single goal is to answer the user's question as accurately as possible.
    Today is ${entry.question_date}.

Use the search tool if the question may rely on past conversation details.
By default the tool searches user chunks. Only set include_assistant=true if the question explicitly asks about the assistant's prior responses.
Use top_k=12 unless there is a strong reason to use fewer.
If the question uses relative time (e.g., “last month”), interpret it flexibly (e.g., last 30 days or the current month) and avoid overly narrow date filters.
When answering relative-time questions (e.g., “today,” “yesterday,” “X days ago”), interpret them relative to the question date above, not the real current date.
Use the retrieved chunks as evidence and answer directly. Do not include reasoning in your answer.
If the question asks for a number or count, respond with only the number.
If the information is not present, say "I don't have that information."
In your final answer, do not ask the user any questions; just give your best answer.`;

  const baseMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: entry.question },
  ];

  const transcript: Record<string, unknown> = {
    questionId: entry.question_id,
    question: entry.question,
    expectedAnswer: entry.answer,
    llmModel: api.llmModel,
    messages: [...baseMessages],
    toolCalls: [],
    toolResults: [],
    finalAnswer: "",
    retrieval: {
      precision: 0,
      recall: 0,
      retrievedSessionIds: [],
      expectedSessionIds: entry.answer_session_ids,
    },
  };

  let retrievedChunks: Array<SessionChunk & { similarity: number }> = [];
  let generatedAnswer = "";

  try {
    const firstResponse = await callChatCompletion(api, baseMessages, {
      tools: [tool],
      toolChoice: "auto",
      maxTokens: 500,
    });

    transcript.firstResponse = firstResponse;

    if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
      const toolResults: Array<{
        role: "tool";
        tool_call_id: string;
        content: string;
      }> = [];

      for (const toolCall of firstResponse.toolCalls) {
        if (toolCall.function?.name !== CHUNK_TOOL_NAME) {
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Unsupported tool call" }),
          });
          continue;
        }

        let args: {
          query?: string;
          include_assistant?: boolean;
          top_k?: number;
          start_date?: string;
          end_date?: string;
        } = {};

        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          args = {};
        }

        let effectiveQueryEmbedding = queryEmbedding;
        if (args.query && args.query.trim() !== entry.question.trim()) {
          const [altEmbedding] = await generateEmbeddings([args.query], api);
          if (altEmbedding && altEmbedding.length > 0) {
            effectiveQueryEmbedding = altEmbedding;
          }
        }

        const includeAssistant = Boolean(args.include_assistant);
        const topK = args.top_k && args.top_k > 0 ? args.top_k : 8;
        const startDate = undefined;
        const endDate = undefined;

        const results = searchChunks(
          chunks,
          effectiveQueryEmbedding,
          topK,
          includeAssistant,
          startDate,
          endDate
        );

        retrievedChunks = results;
        const answerSessionIdSet = new Set(entry.answer_session_ids);
        const retrievedSessionIdSet = new Set(results.map((chunk) => chunk.sessionId));

        const annotatedChunks = results.map((chunk) => ({
          role: chunk.role,
          content: chunk.content,
          sessionId: chunk.sessionId,
          sessionIndex: chunk.sessionIndex,
          messageIndex: chunk.messageIndex,
          timestamp: entry.haystack_dates[chunk.sessionIndex],
          similarity: chunk.similarity,
          oracleRelevant: answerSessionIdSet.has(chunk.sessionId),
        }));

        const searchPool = searchChunks(
          chunks,
          effectiveQueryEmbedding,
          Number.MAX_SAFE_INTEGER,
          includeAssistant,
          startDate,
          endDate
        );

        const missingChunks = entry.answer_session_ids
          .filter((sessionId) => !retrievedSessionIdSet.has(sessionId))
          .map((sessionId) => {
            const candidates = searchPool
              .filter((chunk) => chunk.sessionId === sessionId)
              .map((chunk) => ({
                role: chunk.role,
                content: chunk.content,
                sessionId: chunk.sessionId,
                sessionIndex: chunk.sessionIndex,
                messageIndex: chunk.messageIndex,
                timestamp: entry.haystack_dates[chunk.sessionIndex],
                similarity: chunk.similarity,
              }))
              .sort((a, b) => b.similarity - a.similarity);

            return {
              sessionId,
              bestChunk: candidates[0] || null,
            };
          });

        const toolResultPayload = {
          chunks: annotatedChunks,
          missingChunks,
        };

        const sortedForPrompt = [...annotatedChunks].sort((a, b) => {
          const aTs = parseLongMemEvalTimestamp(a.timestamp);
          const bTs = parseLongMemEvalTimestamp(b.timestamp);
          if (!Number.isNaN(aTs) && !Number.isNaN(bTs)) {
            return aTs - bTs;
          }
          return a.sessionIndex - b.sessionIndex;
        });

        const toolResultText = [
          "Relevant past conversation excerpts (ordered earliest to latest):",
          ...sortedForPrompt.map(
            (chunk) => `[${chunk.timestamp}] ${chunk.role}: ${chunk.content}`
          ),
          "End of excerpts.",
        ].join("\n");

        transcript.retrieval = {
          precision:
            retrievedSessionIdSet.size > 0
              ? [...retrievedSessionIdSet].filter((id) =>
                  answerSessionIdSet.has(id)
                ).length / retrievedSessionIdSet.size
              : 0,
          recall:
            answerSessionIdSet.size > 0
              ? [...retrievedSessionIdSet].filter((id) =>
                  answerSessionIdSet.has(id)
                ).length / answerSessionIdSet.size
              : 0,
          retrievedSessionIds: [...retrievedSessionIdSet],
          expectedSessionIds: entry.answer_session_ids,
        };

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResultText,
        });

        transcript.toolCalls.push({
          id: toolCall.id,
          name: toolCall.function?.name,
          arguments: toolCall.function?.arguments,
        });
        transcript.toolResults.push({
          payload: toolResultPayload,
          text: toolResultText,
        });
      }

      const followupContent = [
        entry.question,
        "",
        toolResults.map((result) => result.content).join("\n"),
      ].join("\n");

      const secondResponse = await callChatCompletion(
        api,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: followupContent },
        ],
        {
          toolChoice: "none",
          maxTokens: 500,
        }
      );
      transcript.secondResponse = secondResponse;
      generatedAnswer = secondResponse.content || "";
    } else {
      generatedAnswer = firstResponse.content || "";
    }
  } catch (error) {
    console.error("Chunked tool answering failed:", error);
    generatedAnswer = "";
    transcript.error = String(error);
  }

  transcript.finalAnswer = generatedAnswer;

  logProgress("Evaluating answer...");
  const isCorrect = await evaluateAnswer(
    entry.question,
    entry.answer,
    generatedAnswer,
    api
  );
  clearProgress();
  transcript.isCorrect = isCorrect;

  const retrievedSessionIds = new Set<string>();
  for (const chunk of retrievedChunks) {
    retrievedSessionIds.add(chunk.sessionId);
  }

  const expectedSessionIds = new Set(entry.answer_session_ids);
  const correctlyRetrieved = [...retrievedSessionIds].filter((id) =>
    expectedSessionIds.has(id)
  ).length;

  const retrievalPrecision =
    retrievedSessionIds.size > 0
      ? correctlyRetrieved / retrievedSessionIds.size
      : 0;
  const retrievalRecall =
    expectedSessionIds.size > 0
      ? correctlyRetrieved / expectedSessionIds.size
      : 0;

  const elapsed = performance.now() - startTime;

  try {
    const transcriptPath = getTranscriptPath(entry.question_id);
    await mkdir(join(getCacheDirectory(), "transcripts"), { recursive: true });
    await writeFile(transcriptPath, JSON.stringify(transcript, null, 2));
    if (verbose) {
      console.log(`  Transcript saved: ${transcriptPath}`);
    }
  } catch (error) {
    console.error("Failed to save transcript:", error);
  }

  if (verbose) {
    console.log(`  Answer: ${generatedAnswer.slice(0, 100)}...`);
    console.log(`  Expected: ${entry.answer}`);
    console.log(`  Correct: ${isCorrect}`);
    console.log(`  Time: ${elapsed.toFixed(0)}ms`);
  }

  return {
    questionId: entry.question_id,
    questionType: entry.question_type,
    question: entry.question,
    expectedAnswer: entry.answer,
    generatedAnswer,
    isCorrect,
    retrievedSessionIds: [...retrievedSessionIds],
    expectedSessionIds: entry.answer_session_ids,
    retrievalPrecision,
    retrievalRecall,
    latencyMs: elapsed,
  };
}

/**
 * Run the LongMemEval benchmark
 */
export async function runLongMemEval(
  dataset: LongMemEvalEntry[],
  options: LongMemEvalOptions,
  api: ApiConfig
): Promise<LongMemEvalSummary> {
  const unsupportedTypes: LongMemEvalQuestionType[] = [
    "temporal-reasoning",
    "knowledge-update",
  ];

  // Filter dataset
  let entries = dataset;

  if (options.questionTypes && options.questionTypes.length > 0) {
    entries = entries.filter((e) =>
      options.questionTypes!.includes(e.question_type)
    );
  }

  if (options.questionId) {
    entries = entries.filter((e) => e.question_id === options.questionId);
  }

  if (options.skipUnsupported) {
    entries = entries.filter(
      (e) => !unsupportedTypes.includes(e.question_type)
    );
    console.log(
      `Skipping unsupported question types: ${unsupportedTypes.join(", ")}`
    );
  }

  if (options.maxQuestions && options.maxQuestions < entries.length) {
    entries = entries.slice(0, options.maxQuestions);
  }

  const strategy = options.strategy || "extracted-memories";
  const llmModel = options.llmModel || api.llmModel;

  console.log(
    `\nRunning LongMemEval benchmark (${options.variant} variant, ${strategy} strategy)`
  );
  if (options.llmModel) {
    console.log(`LLM model: ${llmModel}`);
  }
  console.log(`Total questions: ${entries.length}`);
  if (options.maxSessions) {
    console.log(`Max sessions per question: ${options.maxSessions}`);
  }
  console.log("");

  const results: LongMemEvalResult[] = [];
  const latencies: number[] = [];
  let chunkCache: LongMemEvalChunkEmbeddingsCache | undefined;

  if (strategy === "chunked-tool") {
    chunkCache = await loadChunkEmbeddingCache(
      options.variant,
      DEFAULT_API_EMBEDDING_MODEL
    );
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(`[${i + 1}/${entries.length}] ${entry.question_id}`);

    try {
      if (strategy === "chunked-tool" && options.skipExisting) {
        const hasTranscript = await transcriptMatchesModel(
          entry.question_id,
          llmModel
        );
        if (hasTranscript) {
          console.log("  ↷ Skipping (existing transcript for same model)");
          continue;
        }
      }

      const result =
        strategy === "chunked-tool" && chunkCache
          ? await processEntryChunked(
              entry,
              { ...api, llmModel },
              chunkCache,
              options.verbose || false,
              options.maxSessions
            )
          : await processEntry(
              entry,
              { ...api, llmModel },
              options.verbose || false,
              options.maxSessions
            );
      results.push(result);
      latencies.push(result.latencyMs);

      console.log(
        `  ${result.isCorrect ? "✓" : "✗"} ${
          result.questionType
        } (${result.latencyMs.toFixed(0)}ms)`
      );

      if (strategy === "chunked-tool" && chunkCache) {
        await saveChunkEmbeddingCache(chunkCache);
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${entry.question_id}:`, error);
      results.push({
        questionId: entry.question_id,
        questionType: entry.question_type,
        question: entry.question,
        expectedAnswer: entry.answer,
        generatedAnswer: "",
        isCorrect: false,
        retrievedSessionIds: [],
        expectedSessionIds: entry.answer_session_ids,
        retrievalPrecision: 0,
        retrievalRecall: 0,
        latencyMs: 0,
        details: { error: String(error) },
      });
    }
  }

  // Aggregate results by question type
  const byQuestionType: LongMemEvalSummary["byQuestionType"] = {} as any;
  for (const type of [
    "single-session-user",
    "single-session-assistant",
    "single-session-preference",
    "temporal-reasoning",
    "knowledge-update",
    "multi-session",
  ] as const) {
    const typeResults = results.filter((r) => r.questionType === type);
    if (typeResults.length > 0) {
      byQuestionType[type] = {
        total: typeResults.length,
        correct: typeResults.filter((r) => r.isCorrect).length,
        accuracy:
          typeResults.filter((r) => r.isCorrect).length / typeResults.length,
      };
    }
  }

  const latencyStats = calculatePercentiles(latencies);
  const correctCount = results.filter((r) => r.isCorrect).length;

  return {
    timestamp: new Date().toISOString(),
    datasetName: `longmemeval_${options.variant}_${strategy}`,
    totalQuestions: results.length,
    correctAnswers: correctCount,
    accuracy: results.length > 0 ? correctCount / results.length : 0,
    byQuestionType,
    retrieval: {
      avgPrecision:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.retrievalPrecision, 0) /
            results.length
          : 0,
      avgRecall:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.retrievalRecall, 0) /
            results.length
          : 0,
    },
    latency: {
      p50: latencyStats.p50,
      p95: latencyStats.p95,
      p99: latencyStats.p99,
      mean: latencyStats.mean,
    },
    results: options.verbose ? results : [],
  };
}
