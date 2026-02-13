/**
 * LongMemEval Benchmark Suite
 *
 * Shared orchestration and utility functions for running the LongMemEval
 * benchmark against both memory systems (engine and vault).
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
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../../src/lib/memoryRetrieval/constants.js";
import type {
  LongMemEvalEntry,
  LongMemEvalSession,
  LongMemEvalResult,
  LongMemEvalSummary,
  LongMemEvalComparisonSummary,
  LongMemEvalOptions,
  LongMemEvalQuestionType,
  LongMemEvalChunkEmbeddingsCache,
  ApiConfig,
} from "./types.js";
import { calculatePercentiles } from "../metrics.js";
import { getCacheDirectory } from "./dataset.js";
import { processEntryMemoryEngine } from "./memoryEngineStrategy.js";
import { processEntryMemoryVault } from "./memoryVaultStrategy.js";

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

// ── Shared types ──

export interface ExtractedMemory {
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

// ── Database setup ──

export async function setupDatabase(): Promise<Database> {
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

// ── JSON extraction ──

export function extractJsonFromResponse(content: string): string {
  let jsonStr = content.trim();

  if (jsonStr.includes("```")) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  return jsonStr;
}

// ── Caching helpers ──

function safeModelName(model: string): string {
  return model.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

export function getChunkCachePath(variant: "s" | "m", model: string): string {
  const filename = `longmemeval_chunk_embeddings_${variant}_${safeModelName(model)}.json`;
  return join(getCacheDirectory(), filename);
}

export function getTranscriptPath(questionId: string): string {
  return join(getCacheDirectory(), "transcripts", `${questionId}.json`);
}

export async function transcriptMatchesModel(
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

export async function loadChunkEmbeddingCache(
  variant: "s" | "m",
  model: string
): Promise<LongMemEvalChunkEmbeddingsCache> {
  const cachePath = getChunkCachePath(variant, model);
  try {
    const data = await readFile(cachePath, "utf-8");
    const parsed = JSON.parse(data) as LongMemEvalChunkEmbeddingsCache;
    if (parsed.model !== model || parsed.variant !== variant) {
      return { version: "1", model, variant, entries: {} };
    }
    return parsed;
  } catch {
    return { version: "1", model, variant, entries: {} };
  }
}

export async function saveChunkEmbeddingCache(
  cache: LongMemEvalChunkEmbeddingsCache
): Promise<void> {
  const cachePath = getChunkCachePath(cache.variant, cache.model);
  await writeFile(cachePath, JSON.stringify(cache));
}

export function hashChunkContent(role: "user" | "assistant", content: string): string {
  return createHash("sha1").update(`${role}|${content}`).digest("hex");
}

export async function saveTranscript(
  questionId: string,
  transcript: Record<string, unknown>,
  verbose: boolean
): Promise<void> {
  try {
    const transcriptPath = getTranscriptPath(questionId);
    await mkdir(join(getCacheDirectory(), "transcripts"), { recursive: true });
    await writeFile(transcriptPath, JSON.stringify(transcript, null, 2));
    if (verbose) {
      console.log(`  Transcript saved: ${transcriptPath}`);
    }
  } catch (error) {
    console.error("Failed to save transcript:", error);
  }
}

// ── LLM utilities ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callChatCompletion(
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

      return { content, toolCalls };
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
  throw lastError instanceof Error ? lastError : new Error("Chat completion failed");
}

export async function evaluateAnswer(
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

    if (!response.ok) return false;

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const result = data.choices[0]?.message?.content?.trim().toUpperCase() || "";
    return result.includes("CORRECT") && !result.includes("INCORRECT");
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return false;
  }
}

export async function extractMemoriesFromSession(
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

    if (!response.ok) return [];

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content || "{}";
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
    return [];
  }
}

export async function generateEmbeddingsBatch(
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

export async function generateSingleEmbedding(
  text: string,
  api: ApiConfig
): Promise<number[]> {
  const [embedding] = await generateEmbeddingsBatch([text], api);
  return embedding || [];
}

// ── Progress logging ──

export function logProgress(message: string): void {
  if (process.stdout.isTTY) {
    process.stdout.write(`\r  ${message.padEnd(60)}`);
  }
}

export function clearProgress(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\r" + " ".repeat(65) + "\r");
  }
}

// ── Session selection ──

export function selectSessions(
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

  const answerSessionIndices = new Set<number>();
  for (const answerId of entry.answer_session_ids) {
    const idx = entry.haystack_session_ids.indexOf(answerId);
    if (idx !== -1) answerSessionIndices.add(idx);
  }

  const selected = new Set<number>(answerSessionIndices);
  for (let i = 0; i < totalAvailable && selected.size < maxSessions; i++) {
    selected.add(i);
  }

  return {
    indices: Array.from(selected).sort((a, b) => a - b),
    limited: true,
  };
}

// ── Result aggregation ──

function aggregateSummary(
  results: LongMemEvalResult[],
  latencies: number[],
  options: LongMemEvalOptions,
  strategy: "memory-engine" | "memory-vault"
): LongMemEvalSummary {
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
        accuracy: typeResults.filter((r) => r.isCorrect).length / typeResults.length,
      };
    }
  }

  const latencyStats = calculatePercentiles(latencies);
  const correctCount = results.filter((r) => r.isCorrect).length;

  return {
    timestamp: new Date().toISOString(),
    datasetName: `longmemeval_${options.variant}_${strategy}`,
    strategy,
    totalQuestions: results.length,
    correctAnswers: correctCount,
    accuracy: results.length > 0 ? correctCount / results.length : 0,
    byQuestionType,
    retrieval: {
      avgPrecision:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.retrievalPrecision, 0) / results.length
          : 0,
      avgRecall:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.retrievalRecall, 0) / results.length
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

// ── Main orchestrator ──

export async function runLongMemEval(
  dataset: LongMemEvalEntry[],
  options: LongMemEvalOptions,
  api: ApiConfig
): Promise<LongMemEvalSummary | LongMemEvalComparisonSummary> {
  const unsupportedTypes: LongMemEvalQuestionType[] = [
    "temporal-reasoning",
    "knowledge-update",
  ];

  let entries = dataset;

  if (options.questionTypes && options.questionTypes.length > 0) {
    entries = entries.filter((e) => options.questionTypes!.includes(e.question_type));
  }

  if (options.questionId) {
    entries = entries.filter((e) => e.question_id === options.questionId);
  }

  if (options.skipUnsupported) {
    entries = entries.filter((e) => !unsupportedTypes.includes(e.question_type));
    console.log(`Skipping unsupported question types: ${unsupportedTypes.join(", ")}`);
  }

  if (options.maxQuestions && options.maxQuestions < entries.length) {
    entries = entries.slice(0, options.maxQuestions);
  }

  const strategy = options.strategy || "both";
  const llmModel = options.llmModel || api.llmModel;
  const strategies: Array<"memory-engine" | "memory-vault"> =
    strategy === "both"
      ? ["memory-engine", "memory-vault"]
      : [strategy as "memory-engine" | "memory-vault"];

  console.log(
    `\nRunning LongMemEval benchmark (${options.variant} variant, ${strategy} strategy)`
  );
  if (options.llmModel) console.log(`LLM model: ${llmModel}`);
  console.log(`Total questions: ${entries.length}`);
  if (options.maxSessions) console.log(`Max sessions per question: ${options.maxSessions}`);
  console.log("");

  // Load embedding caches for strategies that need them
  const chunkCache = strategies.includes("memory-engine")
    ? await loadChunkEmbeddingCache(options.variant, DEFAULT_API_EMBEDDING_MODEL)
    : undefined;

  const summaries: Record<string, LongMemEvalSummary> = {};

  for (const strat of strategies) {
    const results: LongMemEvalResult[] = [];
    const latencies: number[] = [];

    if (strategies.length > 1) {
      console.log(`\n── Strategy: ${strat} ──\n`);
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      console.log(`[${i + 1}/${entries.length}] ${entry.question_id}`);

      try {
        if (strat === "memory-engine" && options.skipExisting) {
          const hasTranscript = await transcriptMatchesModel(entry.question_id, llmModel);
          if (hasTranscript) {
            console.log("  ↷ Skipping (existing transcript for same model)");
            continue;
          }
        }

        let result: LongMemEvalResult;
        if (strat === "memory-engine") {
          result = await processEntryMemoryEngine(
            entry,
            { ...api, llmModel },
            chunkCache!,
            options.verbose || false,
            options.maxSessions
          );
        } else {
          result = await processEntryMemoryVault(
            entry,
            { ...api, llmModel },
            options.verbose || false,
            options.maxSessions
          );
        }

        results.push(result);
        latencies.push(result.latencyMs);

        console.log(
          `  ${result.isCorrect ? "✓" : "✗"} ${result.questionType} (${result.latencyMs.toFixed(0)}ms)`
        );

        // Save chunk cache periodically for engine strategy
        if (strat === "memory-engine" && chunkCache) {
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
          strategy: strat,
          details: { error: String(error) },
        });
      }
    }

    summaries[strat] = aggregateSummary(results, latencies, options, strat);
  }

  if (strategy === "both") {
    return {
      engine: summaries["memory-engine"],
      vault: summaries["memory-vault"],
    } as LongMemEvalComparisonSummary;
  }

  return summaries[strategies[0]];
}
