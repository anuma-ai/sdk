/**
 * LongMemEval Benchmark Suite
 *
 * Shared orchestration and utility functions for running the LongMemEval
 * benchmark against both memory systems (engine and vault).
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { sdkSchema, sdkMigrations, sdkModelClasses } from "../../../../src/lib/db/schema.js";
import { type StorageOperationsContext } from "../../../../src/lib/db/chat/operations.js";
import { Conversation, Message } from "../../../../src/lib/db/chat/models.js";
import { type VaultMemoryOperationsContext } from "../../../../src/lib/db/memoryVault/operations.js";
import { VaultMemory } from "../../../../src/lib/db/memoryVault/models.js";
import { Entity, MemoryEntity } from "../../../../src/lib/db/entities/models.js";
import { type EntityOperationsContext } from "../../../../src/lib/db/entities/operations.js";
import type {
  LongMemEvalEntry,
  LongMemEvalSession,
  LongMemEvalResult,
  LongMemEvalSummary,
  LongMemEvalComparisonSummary,
  LongMemEvalOptions,
  LongMemEvalQuestionType,
  ApiConfig,
} from "./types.js";
import { calculatePercentiles } from "../metrics.js";
import { getCacheDirectory } from "./dataset.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../../src/lib/memoryEngine/constants.js";
import { processEntryMemoryEngine } from "./memoryEngineStrategy.js";
import { processEntryMemoryVault } from "./memoryVaultStrategy.js";
import { processEntryEnsemble } from "./ensembleStrategy.js";
import { processEntryRecall } from "./recallStrategy.js";

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
  content: string;
  kind: "state" | "event";
  occurredAt: string | null;
  confidence: number;
  /** Named entities (people, places, things). Drives the W5 graph lane. */
  entities: string[];
  embedding?: number[];
}

// ── Embedding cache persistence ──

async function loadEmbeddingCache(path: string): Promise<Map<string, number[]>> {
  try {
    await access(path);
    const data = await readFile(path, "utf-8");
    const entries: [string, number[]][] = JSON.parse(data);
    console.log(`Loaded ${entries.length} cached embeddings from disk`);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

async function saveEmbeddingCache(path: string, cache: Map<string, number[]>): Promise<void> {
  try {
    await mkdir(join(path, ".."), { recursive: true });
    // Stream entries one-by-one to avoid building a huge JSON string in memory.
    const stream = createWriteStream(path);
    stream.write("[");
    let first = true;
    for (const [key, value] of cache) {
      if (!first) stream.write(",");
      first = false;
      stream.write(JSON.stringify([key, value]));
    }
    stream.write("]");
    await new Promise<void>((resolve, reject) => {
      stream.end(() => resolve());
      stream.on("error", reject);
    });
    console.log(`Saved ${cache.size} embeddings to cache`);
  } catch (error) {
    console.error("Failed to save embedding cache:", error);
  }
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

// ── DB context constructors (shared by strategies) ──

export function createVaultContext(db: Database): VaultMemoryOperationsContext {
  return {
    database: db,
    vaultMemoryCollection: db.collections.get<VaultMemory>("memory_vault"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  };
}

export function createEntityContext(db: Database): EntityOperationsContext {
  return {
    database: db,
    entityCollection: db.collections.get<Entity>("entity"),
    memoryEntityCollection: db.collections.get<MemoryEntity>("memory_entity"),
  };
}

export function createStorageContext(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.collections.get<Message>("history"),
    conversationsCollection: db.collections.get<Conversation>("conversations"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  };
}

// ── Date helpers ──

/**
 * Normalize LongMemEval's `YYYY/MM/DD (Day) HH:MM` haystack-date format
 * into the `YYYY-MM-DD` shape the extraction prompt expects as
 * "Observation date". Strategies should pass the SESSION's haystack date
 * (not entry.question_date) so the extractor resolves "today" /
 * "N days ago" against when the conversation happened, not when the
 * question is being asked — collapsing event_time onto question_date
 * was the dominant temporal-reasoning failure mode (51% of misses).
 */
export function formatHaystackDateAsObservation(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (!match) return raw;
  const [, yyyy, mm, dd] = match;
  return `${yyyy}-${mm}-${dd}`;
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

// ── Transcript helpers ──

export function getTranscriptPath(questionId: string): string {
  return join(getCacheDirectory(), "transcripts", `${questionId}.json`);
}

export async function transcriptMatchesModel(questionId: string, model: string): Promise<boolean> {
  try {
    const data = await readFile(getTranscriptPath(questionId), "utf-8");
    const parsed = JSON.parse(data) as { llmModel?: string };
    return parsed.llmModel === model;
  } catch {
    return false;
  }
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

/**
 * Round-robin sample of N entries that gives roughly equal coverage of
 * every question_type present. Preserves the original intra-type order
 * (deterministic across runs) and the original surfacing order across
 * types so the printed run log stays readable. When N >= length, all
 * entries are returned in the original order.
 */
function stratifyByType(entries: LongMemEvalEntry[], n: number): LongMemEvalEntry[] {
  if (n >= entries.length) return entries;

  // Group preserving first-appearance order.
  const byType = new Map<string, LongMemEvalEntry[]>();
  for (const e of entries) {
    const bucket = byType.get(e.question_type);
    if (bucket) bucket.push(e);
    else byType.set(e.question_type, [e]);
  }

  // Round-robin pull from each bucket until we hit N.
  const buckets = Array.from(byType.values());
  const picked: LongMemEvalEntry[] = [];
  let i = 0;
  while (picked.length < n) {
    const bucket = buckets[i % buckets.length];
    if (bucket.length > 0) picked.push(bucket.shift()!);
    i++;
    // Drop empty buckets so we don't spin uselessly.
    if (i % buckets.length === 0 && buckets.every((b) => b.length === 0)) break;
  }
  return picked;
}

export async function callChatCompletion(
  api: ApiConfig,
  messages: Array<{ role: string; content?: string; tool_calls?: any; tool_call_id?: string }>,
  options?: {
    tools?: Array<{ type: "function"; function: any }>;
    toolChoice?: string | Record<string, unknown>;
    maxTokens?: number;
  }
): Promise<{
  content: string;
  toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  const maxAttempts = 6;
  let lastStatus: number | null = null;
  let lastError: unknown;
  let emptyRetryUsed = false;

  // Exponential backoff with jitter for transient errors. 429s hit hard
  // at concurrency=100 — Fireworks rate limits have tightened since the
  // March 11 baseline run (which had zero 429s in its logs). Linear
  // 250ms*N backoff was too short: bursts had every worker retry into
  // the same rate window and fail.
  const backoffMs = (attempt: number, status: number | null): number => {
    const base = status === 429 ? 1000 : 250;
    const exp = base * 2 ** (attempt - 1);
    const jitter = Math.random() * 0.4 * exp; // ±20% to avoid thundering herd
    return Math.min(15_000, exp + jitter);
  };

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
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": api.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastStatus = response.status;
        if (attempt < maxAttempts) {
          await sleep(backoffMs(attempt, response.status));
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
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const message = data.choices[0]?.message;
      const toolCalls =
        options?.tools && options.tools.length > 0 ? message?.tool_calls : undefined;
      const content = message?.content || "";

      if (!content && !toolCalls && !emptyRetryUsed && attempt < maxAttempts) {
        emptyRetryUsed = true;
        await sleep(backoffMs(attempt, null));
        continue;
      }

      return { content, toolCalls, usage: data.usage };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt, lastStatus));
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
): Promise<{
  isCorrect: boolean;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
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

    if (!response.ok) return { isCorrect: false };

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const result = data.choices[0]?.message?.content?.trim().toUpperCase() || "";
    const isCorrect = result.includes("CORRECT") && !result.includes("INCORRECT");
    return { isCorrect, usage: data.usage };
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return { isCorrect: false };
  }
}

export async function extractMemoriesFromSession(
  session: LongMemEvalSession,
  sessionIndex: number,
  sessionId: string,
  api: ApiConfig,
  observationDate?: string
): Promise<ExtractedMemory[]> {
  const conversationText = session.map((msg) => `${msg.role}: ${msg.content}`).join("\n");
  const obsDate = observationDate ?? new Date().toISOString().split("T")[0];

  // Extraction prompt — adapted from Mem0 (contextual richness, absolute
  // dates, preserve specifics) + Hindsight's `fact_kind: event | conversation`
  // split. Designed to fix three failure modes we observed on LongMemEval:
  // (1) over-aggregation duplicating the same logical fact 4× across sessions,
  // (2) awkward boolean key-value shapes burying the actual fact in
  // `rawEvidence`, (3) under-extraction of episodic events ("went to bed at
  // 2 AM the night before doctor's appointment") because the prior prompt
  // only asked for "durable" facts.
  const extractionPrompt = `You extract memories from a chat conversation for a personal memory system. The user will return tomorrow, next week, or next year and ask questions that depend on these memories.

Observation date: ${obsDate}
Conversation:
${conversationText}

OUTPUT — strict JSON, no prose, no markdown:
{
  "items": [
    {
      "content": "<self-contained natural-language sentence, 15–80 words, present-tense, third-person>",
      "kind": "state" | "event",
      "occurredAt": "<ISO date YYYY-MM-DD if kind is event, otherwise null>",
      "confidence": 0.0-1.0,
      "entities": ["<named entities mentioned: people, places, things, brands; skip generic nouns>"]
    }
  ]
}

If no memories worth keeping, return {"items": []}.

WHAT TO EXTRACT — facts about the user themselves.

- "state" — durable: identity, preferences, relationships, ongoing situations, allergies, names, addresses. Should still be true 6 months from now.
- "event" — dated occurrences: meals eaten, trips taken, meetings, bedtimes, purchases, doctor visits, things "I did yesterday".

Casual topics ARE extractable. Pet names, what they ate for breakfast, a friend's birthday, what time they went to bed, the route they took to work.

WHAT NOT TO EXTRACT:

- Greetings, filler ("got it", "ok"), confirmations of the assistant's reply
- Hypotheticals ("if I were to move to Tokyo…")
- Pure search/task requests with no durable answer ("draft an email", "what's the weather")
- Facts about other people that don't connect to the user or the conversation
- Facts already implied by other extracted memories (consolidate, don't duplicate)

CONTENT RULES:

- Self-contained natural-language sentences, NEVER key-value or boolean shapes. NOT "has_favorite_yoga_pants: true". INSTEAD "User has a favorite pair of yoga pants worn to the gym last Thursday".
- Preserve specifics verbatim — proper nouns, brand names, quantities, addresses, exact prices, exact times. Do NOT generalize "Mochi the corgi" into "user's dog".
- ONE MEMORY PER DISTINCT FACT. If the conversation mentions the user's aunt's twins named Ava and Lily born in April, that is ONE memory ("User's aunt has newborn twin girls Ava and Lily, born April 2026"), not four overlapping facets.
- Resolve relative dates against the Observation Date above. "Last Thursday" + Observation Date ${obsDate} → an absolute date. Never write "yesterday" or "recently".
- Coreference: if the user mentions "my partner" then later says "Sara", combine — write "User's partner is Sara". Use the most complete identifier.
- 15–80 words. Long enough to be self-contained for retrieval; short enough to be one fact.

Confidence: 0.9+ for unambiguous statements, 0.7–0.9 for likely-true, 0.5–0.7 for inferred. Below 0.5: skip.`;

  // Same exponential-backoff retry pattern as callChatCompletion. Extraction
  // hits the LLM under high concurrency, so 429s here will silently empty the
  // vault for that session — much costlier than a missing answer because the
  // memory is gone for *every* downstream search. Retry hard before giving up.
  const maxAttempts = 6;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": api.apiKey,
        },
        body: JSON.stringify({
          model: api.llmModel,
          messages: [{ role: "user", content: extractionPrompt }],
          temperature: 0,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        if (attempt < maxAttempts && (response.status === 429 || response.status >= 500)) {
          const base = response.status === 429 ? 1000 : 250;
          const exp = base * 2 ** (attempt - 1);
          await sleep(Math.min(15_000, exp + Math.random() * 0.4 * exp));
          continue;
        }
        console.warn(
          `Extraction failed (session ${sessionId}): HTTP ${response.status} after ${attempt} attempts`
        );
        return [];
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices[0]?.message?.content || "{}";
      const jsonStr = extractJsonFromResponse(content);

      const parsed = JSON.parse(jsonStr) as {
        items?: Array<{
          content?: string;
          kind?: string;
          occurredAt?: string | null;
          confidence?: number;
          entities?: unknown;
        }>;
      };

      return (parsed.items ?? [])
        .map((item) => {
          const content = (item.content ?? "").trim();
          if (!content) return null;
          const kind = item.kind === "event" ? "event" : "state";
          const occurredAt =
            kind === "event" && typeof item.occurredAt === "string" ? item.occurredAt : null;
          const confidence = typeof item.confidence === "number" ? item.confidence : 0.7;
          // Defensive parse — older bench runs / models without graph-lane
          // awareness may omit entities or return non-array shapes.
          const entities = Array.isArray(item.entities)
            ? item.entities.filter((e): e is string => typeof e === "string" && e.trim().length > 0)
            : [];
          return {
            sessionIndex,
            sessionId,
            content,
            kind,
            occurredAt,
            confidence,
            entities,
          } satisfies ExtractedMemory;
        })
        .filter((m): m is ExtractedMemory => m !== null);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const exp = 250 * 2 ** (attempt - 1);
        await sleep(Math.min(15_000, exp + Math.random() * 0.4 * exp));
        continue;
      }
    }
  }
  console.warn(
    `Extraction failed (session ${sessionId}) after ${maxAttempts} attempts:`,
    lastError
  );
  return [];
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
  strategy: "memory-engine" | "memory-vault" | "memory-recall" | "memory-ensemble"
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

  const totalTokenUsage = results.reduce(
    (acc, r) => ({
      promptTokens: acc.promptTokens + r.tokenUsage.promptTokens,
      completionTokens: acc.completionTokens + r.tokenUsage.completionTokens,
      totalTokens: acc.totalTokens + r.tokenUsage.totalTokens,
      embeddingTokens: acc.embeddingTokens + r.tokenUsage.embeddingTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, embeddingTokens: 0 }
  );

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
    tokenUsage: totalTokenUsage,
    results: options.verbose ? results : [],
  };
}

// ── Main orchestrator ──

export async function runLongMemEval(
  dataset: LongMemEvalEntry[],
  options: LongMemEvalOptions,
  api: ApiConfig
): Promise<LongMemEvalSummary | LongMemEvalComparisonSummary> {
  // `temporal-reasoning` is supported as of PR #533 — the W6 temporal
  // lane in recall() parses query time windows (parseQueryTimeWindow)
  // and scores memories by event_time overlap. `knowledge-update`
  // remains gated: the recall pipeline relies on recency boosts +
  // consolidation to surface latest facts, which works in principle
  // but hasn't been validated at the eval level yet — leaving in for
  // now so a known-noisy category doesn't pollute headline accuracy.
  const unsupportedTypes: LongMemEvalQuestionType[] = ["knowledge-update"];

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
    // The oracle dataset clusters questions by type, so a naive
    // .slice(0, N) gives a single-type sample (e.g. all multi-session
    // with N=50) — useless for evaluating cross-type performance.
    // Take roughly equal counts per surviving question type, preserving
    // each type's intra-cluster order so reruns are reproducible.
    entries = stratifyByType(entries, options.maxQuestions);
  }

  const strategy = options.strategy || "both";
  const llmModel = options.llmModel || api.llmModel;
  const strategies: Array<"memory-engine" | "memory-vault" | "memory-recall" | "memory-ensemble"> =
    strategy === "both"
      ? ["memory-engine", "memory-vault"]
      : [strategy as "memory-engine" | "memory-vault" | "memory-recall" | "memory-ensemble"];

  const concurrency = options.concurrency ?? 1;

  console.log(`\nRunning LongMemEval benchmark (${options.variant} variant, ${strategy} strategy)`);
  if (options.llmModel) console.log(`LLM model: ${llmModel}`);
  console.log(`Total questions: ${entries.length}`);
  if (concurrency > 1) console.log(`Concurrency: ${concurrency}`);
  if (options.maxSessions) console.log(`Max sessions per question: ${options.maxSessions}`);
  console.log("");

  const summaries: Record<string, LongMemEvalSummary> = {};

  // Shared embedding cache across all questions — avoids re-embedding
  // the same haystack texts that appear in multiple questions.
  // Persisted to disk so subsequent runs skip the embedding API entirely.
  const modelSlug = DEFAULT_API_EMBEDDING_MODEL.replace(/[^a-zA-Z0-9-]/g, "-");
  const embeddingCachePath = join(getCacheDirectory(), `embedding-cache-${modelSlug}.json`);
  const embeddingCache = await loadEmbeddingCache(embeddingCachePath);

  for (const strat of strategies) {
    const results: LongMemEvalResult[] = [];
    const latencies: number[] = [];

    if (strategies.length > 1) {
      console.log(`\n── Strategy: ${strat} ──\n`);
    }

    // Process entries with configurable concurrency.
    // Results are collected in entry order regardless of completion order.
    const orderedResults: (LongMemEvalResult | null)[] = new Array(entries.length).fill(null);
    let completed = 0;

    async function processEntry(i: number): Promise<void> {
      const entry = entries[i];

      try {
        if (options.skipExisting) {
          const hasTranscript = await transcriptMatchesModel(entry.question_id, llmModel);
          if (hasTranscript) {
            completed++;
            console.log(`[${completed}/${entries.length}] ${entry.question_id} ↷ Skipping`);
            return;
          }
        }

        let result: LongMemEvalResult;
        if (strat === "memory-engine") {
          result = await processEntryMemoryEngine(
            entry,
            { ...api, llmModel },
            options.verbose || false,
            options.maxSessions,
            embeddingCache
          );
        } else if (strat === "memory-ensemble") {
          result = await processEntryEnsemble(
            entry,
            { ...api, llmModel },
            options.verbose || false,
            options.maxSessions,
            {
              rerank: options.rerank,
              decompose: options.decompose,
              consolidate: options.consolidate,
            }
          );
        } else if (strat === "memory-recall") {
          result = await processEntryRecall(
            entry,
            { ...api, llmModel },
            options.verbose || false,
            options.maxSessions,
            {
              rerank: options.rerank,
              decompose: options.decompose,
              consolidate: options.consolidate,
              // chunkSourceMaxChars is a memory-vault-pipeline concept
              // (caps raw chunk text before fact extraction). recall()
              // reads chunks directly from storage and has no analogue,
              // so omit it here rather than silently strip it.
              excerptMaxChars: options.excerptMaxChars,
              recallTypes: options.recallTypes,
              recallEmit: options.recallEmit,
              recallLaneMode: options.recallLaneMode,
            }
          );
        } else {
          result = await processEntryMemoryVault(
            entry,
            { ...api, llmModel },
            options.verbose || false,
            options.maxSessions,
            {
              rerank: options.rerank,
              decompose: options.decompose,
              consolidate: options.consolidate,
              chunkSourceMaxChars: options.chunkSourceMaxChars,
              excerptMaxChars: options.excerptMaxChars,
            }
          );
        }

        orderedResults[i] = result;
        completed++;
        console.log(
          `[${completed}/${entries.length}] ${entry.question_id} ${result.isCorrect ? "✓" : "✗"} ${result.questionType} (${result.latencyMs.toFixed(0)}ms)`
        );
      } catch (error) {
        orderedResults[i] = {
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
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, embeddingTokens: 0 },
          strategy: strat,
          details: { error: String(error) },
        };
        completed++;
        console.error(`[${completed}/${entries.length}] ${entry.question_id} ✗ Error:`, error);
      }
    }

    // Concurrency-limited executor
    const pending = new Set<Promise<void>>();
    for (let i = 0; i < entries.length; i++) {
      const p = processEntry(i).then(() => {
        pending.delete(p);
      });
      pending.add(p);
      if (pending.size >= concurrency) {
        await Promise.race(pending);
      }
    }
    await Promise.all(pending);

    for (const result of orderedResults) {
      if (result) {
        results.push(result);
        latencies.push(result.latencyMs);
      }
    }

    summaries[strat] = aggregateSummary(results, latencies, options, strat);

    // Persist embedding cache to disk after each strategy completes
    await saveEmbeddingCache(embeddingCachePath, embeddingCache);
  }

  if (strategy === "both") {
    return {
      engine: summaries["memory-engine"],
      vault: summaries["memory-vault"],
    } as LongMemEvalComparisonSummary;
  }

  return summaries[strategies[0]];
}
