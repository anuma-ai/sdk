/**
 * LongMemEval Benchmark Suite
 *
 * Core evaluation logic for the LongMemEval benchmark.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import * as fs from "node:fs";
import * as path from "node:path";
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
import {
  DEFAULT_API_EMBEDDING_MODEL,
  DEFAULT_COMPLETION_MODEL,
} from "../../../../src/lib/memory/constants.js";
import { FACT_EXTRACTION_PROMPT } from "../../../../src/lib/memory/service.js";
import type {
  LongMemEvalEntry,
  LongMemEvalSession,
  LongMemEvalResult,
  LongMemEvalSummary,
  LongMemEvalOptions,
  LongMemEvalQuestionType,
} from "./types.js";
import { calculatePercentiles } from "../metrics.js";

// Debug output directory
const DEBUG_OUTPUT_DIR = path.join(process.cwd(), ".longmemeval");

/**
 * Initialize debug output directory for a run
 */
function initDebugOutput(runId: string): string {
  const runDir = path.join(DEBUG_OUTPUT_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
}

/**
 * Write debug data for a single entry
 */
interface EntryDebugData {
  questionId: string;
  questionType: string;
  question: string;
  expectedAnswer: string;
  answerSessionIds: string[];
  sessions: Array<{
    index: number;
    sessionId: string;
    isAnswerSession: boolean;
    conversation: Array<{ role: string; content: string }>;
  }>;
  extractedMemories: Array<{
    sessionIndex: number;
    sessionId: string;
    text: string;
    isFromAnswerSession: boolean;
  }>;
  storedMemories: Array<{
    text: string;
    sessionId: string;
    embeddingLength: number;
  }>;
  queryEmbeddingLength: number;
  searchResults: Array<{
    text: string;
    similarity: number;
    sessionId: string | undefined;
    isFromAnswerSession: boolean;
  }>;
  retrievalMetrics: {
    expectedSessionIds: string[];
    retrievedSessionIds: string[];
    correctlyRetrieved: string[];
    missedSessionIds: string[];
    precision: number;
    recall: number;
  };
  generatedAnswer: string;
  isCorrect: boolean;
  latencyMs: number;
}

function writeEntryDebug(runDir: string, data: EntryDebugData): void {
  const entryDir = path.join(runDir, "entries", data.questionId);
  fs.mkdirSync(entryDir, { recursive: true });

  // Write full debug data as JSON
  fs.writeFileSync(
    path.join(entryDir, "debug.json"),
    JSON.stringify(data, null, 2)
  );

  // Write human-readable summary
  const summary = `# ${data.questionId}

## Question
Type: ${data.questionType}
Question: ${data.question}
Expected Answer: ${data.expectedAnswer}
Answer Session IDs: ${data.answerSessionIds.join(", ")}

## Sessions Processed
Total: ${data.sessions.length}
Answer sessions included: ${data.sessions.filter((s) => s.isAnswerSession).length}

${data.sessions
  .map(
    (s) => `### Session ${s.index} (${s.sessionId})${s.isAnswerSession ? " [ANSWER SESSION]" : ""}

${s.conversation.map((m) => `${m.role}: ${m.content}`).join("\n\n")}
`
  )
  .join("\n")}

## Extracted Memories
Total: ${data.extractedMemories.length}
From answer sessions: ${data.extractedMemories.filter((m) => m.isFromAnswerSession).length}

${data.extractedMemories
  .map(
    (m) =>
      `- [Session ${m.sessionIndex}${m.isFromAnswerSession ? " ANSWER" : ""}] ${m.text}`
  )
  .join("\n")}

## Stored Memories
Total: ${data.storedMemories.length}

${data.storedMemories.map((m) => `- [${m.sessionId}] ${m.text} (embedding: ${m.embeddingLength} dims)`).join("\n")}

## Search Results (Top 10)
Query embedding: ${data.queryEmbeddingLength} dimensions

${data.searchResults
  .map(
    (r, i) =>
      `${i + 1}. [sim=${r.similarity.toFixed(3)}] ${r.text}
   Session: ${r.sessionId || "unknown"}${r.isFromAnswerSession ? " [ANSWER SESSION]" : ""}`
  )
  .join("\n\n")}

## Retrieval Metrics
Expected sessions: ${data.retrievalMetrics.expectedSessionIds.join(", ")}
Retrieved sessions: ${data.retrievalMetrics.retrievedSessionIds.join(", ") || "(none)"}
Correctly retrieved: ${data.retrievalMetrics.correctlyRetrieved.join(", ") || "(none)"}
Missed sessions: ${data.retrievalMetrics.missedSessionIds.join(", ") || "(none)"}
Precision: ${(data.retrievalMetrics.precision * 100).toFixed(1)}%
Recall: ${(data.retrievalMetrics.recall * 100).toFixed(1)}%

## Answer
Generated: ${data.generatedAnswer}
Expected: ${data.expectedAnswer}
Correct: ${data.isCorrect ? "YES" : "NO"}
Latency: ${data.latencyMs.toFixed(0)}ms
`;

  fs.writeFileSync(path.join(entryDir, "summary.md"), summary);
}

/**
 * Write run summary
 */
function writeRunSummary(runDir: string, summary: LongMemEvalSummary): void {
  fs.writeFileSync(
    path.join(runDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );

  const md = `# LongMemEval Run Summary

Timestamp: ${summary.timestamp}
Dataset: ${summary.datasetName}

## Overall Results
- Total Questions: ${summary.totalQuestions}
- Correct Answers: ${summary.correctAnswers}
- Accuracy: ${(summary.accuracy * 100).toFixed(1)}%

## By Question Type
${Object.entries(summary.byQuestionType)
  .map(
    ([type, stats]) =>
      `- ${type}: ${stats.correct}/${stats.total} (${(stats.accuracy * 100).toFixed(1)}%)`
  )
  .join("\n")}

## Retrieval Performance
- Avg Precision: ${(summary.retrieval.avgPrecision * 100).toFixed(1)}%
- Avg Recall: ${(summary.retrieval.avgRecall * 100).toFixed(1)}%

## Latency
- P50: ${summary.latency.p50.toFixed(0)}ms
- P95: ${summary.latency.p95.toFixed(0)}ms
- P99: ${summary.latency.p99.toFixed(0)}ms
- Mean: ${summary.latency.mean.toFixed(0)}ms
`;

  fs.writeFileSync(path.join(runDir, "summary.md"), md);
}

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
  text: string;
  embedding?: number[];
}

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
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

  const extractionPrompt = `${FACT_EXTRACTION_PROMPT}

Conversation to extract from:
${conversationText}`;

  try {
    const response = await fetch(`${api.baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": api.apiKey,
      },
      body: JSON.stringify({
        model: DEFAULT_COMPLETION_MODEL,
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
      items: Array<{ text: string }>;
    };

    return (parsed.items || [])
      .filter((item) => item.text && item.text.trim().length > 0)
      .map((item) => ({
        sessionIndex,
        sessionId,
        text: item.text.trim(),
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

/**
 * Answer a question using retrieved memories
 */
async function answerQuestion(
  question: string,
  memories: Array<{ text: string; similarity: number }>,
  api: ApiConfig
): Promise<string> {
  const memoryContext = memories
    .map(
      (m, i) =>
        `[${i + 1}] ${m.text} (relevance: ${m.similarity.toFixed(2)})`
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
        model: DEFAULT_COMPLETION_MODEL,
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
        model: DEFAULT_COMPLETION_MODEL,
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

/**
 * Process a single LongMemEval entry
 */
async function processEntry(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number,
  runDir?: string
): Promise<LongMemEvalResult> {
  const startTime = performance.now();

  const { indices: sessionIndices, limited } = selectSessions(entry, maxSessions);
  const totalSessions = sessionIndices.length;
  const answerSessionIdSet = new Set(entry.answer_session_ids);

  // Debug data collection
  const debugSessions: EntryDebugData["sessions"] = [];
  const debugExtractedMemories: EntryDebugData["extractedMemories"] = [];
  const debugStoredMemories: EntryDebugData["storedMemories"] = [];
  let debugQueryEmbeddingLength = 0;
  let debugSearchResults: EntryDebugData["searchResults"] = [];

  if (verbose) {
    console.log(`\n  Processing: ${entry.question_id}`);
    console.log(`  Type: ${entry.question_type}`);
    const sessionInfo = limited
      ? `${totalSessions}/${entry.haystack_sessions.length} (limited, includes answer sessions)`
      : `${totalSessions}`;
    console.log(`  Sessions: ${sessionInfo}`);
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

      // Collect debug session data
      debugSessions.push({
        index: sessionIdx,
        sessionId,
        isAnswerSession: answerSessionIdSet.has(sessionId),
        conversation: session.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      logProgress(`Extracting memories: ${i + 1}/${totalSessions} sessions`);

      const sessionMemories = await extractMemoriesFromSession(
        session,
        sessionIdx,
        sessionId,
        api
      );
      allMemories.push(...sessionMemories);

      // Collect debug extracted memories
      for (const mem of sessionMemories) {
        debugExtractedMemories.push({
          sessionIndex: mem.sessionIndex,
          sessionId: mem.sessionId,
          text: mem.text,
          isFromAnswerSession: answerSessionIdSet.has(mem.sessionId),
        });
      }

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

      const memoryEmbeddings: number[][] = [];
      for (let i = 0; i < allMemories.length; i++) {
        logProgress(`Generating embeddings: ${i + 1}/${allMemories.length}`);
        const [embedding] = await generateEmbeddings([allMemories[i].text], api);
        memoryEmbeddings.push(embedding);
      }

      clearProgress();

      // Store memories in database
      const memoryToSession = new Map<string, string>();
      logProgress(`Storing ${allMemories.length} memories...`);

      for (let i = 0; i < allMemories.length; i++) {
        const memory = allMemories[i];
        const embedding = memoryEmbeddings[i];

        if (!embedding || embedding.length === 0) continue;

        // Use the memory text as the key for session tracking
        // Preserve answer session attribution for duplicate memories
        const existingSessionId = memoryToSession.get(memory.text);
        if (!existingSessionId || answerSessionIdSet.has(memory.sessionId)) {
          memoryToSession.set(memory.text, memory.sessionId);
        }

        await saveMemoryOp(ctx, {
          text: memory.text,
          conversationId: memory.sessionId,
          embedding,
          embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
        });

        // Collect debug stored memories
        debugStoredMemories.push({
          text: memory.text,
          sessionId: memory.sessionId,
          embeddingLength: embedding.length,
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
      debugQueryEmbeddingLength = queryEmbedding.length;

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
        const sessionId = memoryToSession.get(result.text);
        if (sessionId) {
          retrievedSessionIds.add(sessionId);
        }
        // Collect debug search results
        debugSearchResults.push({
          text: result.text,
          similarity: result.similarity,
          sessionId,
          isFromAnswerSession: sessionId ? answerSessionIdSet.has(sessionId) : false,
        });
      }

      // Calculate retrieval metrics
      const expectedSessionIds = new Set(entry.answer_session_ids);
      const correctlyRetrievedIds = [...retrievedSessionIds].filter((id) =>
        expectedSessionIds.has(id)
      );
      const correctlyRetrieved = correctlyRetrievedIds.length;
      const missedSessionIds = [...expectedSessionIds].filter(
        (id) => !retrievedSessionIds.has(id)
      );

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
        text: r.text,
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

      // Write debug output if runDir provided
      if (runDir) {
        writeEntryDebug(runDir, {
          questionId: entry.question_id,
          questionType: entry.question_type,
          question: entry.question,
          expectedAnswer: entry.answer,
          answerSessionIds: entry.answer_session_ids,
          sessions: debugSessions,
          extractedMemories: debugExtractedMemories,
          storedMemories: debugStoredMemories,
          queryEmbeddingLength: debugQueryEmbeddingLength,
          searchResults: debugSearchResults,
          retrievalMetrics: {
            expectedSessionIds: entry.answer_session_ids,
            retrievedSessionIds: [...retrievedSessionIds],
            correctlyRetrieved: correctlyRetrievedIds,
            missedSessionIds,
            precision: retrievalPrecision,
            recall: retrievalRecall,
          },
          generatedAnswer,
          isCorrect,
          latencyMs: elapsed,
        });
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

    // Write debug output if runDir provided (no memories case)
    if (runDir) {
      writeEntryDebug(runDir, {
        questionId: entry.question_id,
        questionType: entry.question_type,
        question: entry.question,
        expectedAnswer: entry.answer,
        answerSessionIds: entry.answer_session_ids,
        sessions: debugSessions,
        extractedMemories: debugExtractedMemories,
        storedMemories: debugStoredMemories,
        queryEmbeddingLength: 0,
        searchResults: [],
        retrievalMetrics: {
          expectedSessionIds: entry.answer_session_ids,
          retrievedSessionIds: [],
          correctlyRetrieved: [],
          missedSessionIds: entry.answer_session_ids,
          precision: 0,
          recall: 0,
        },
        generatedAnswer,
        isCorrect,
        latencyMs: elapsed,
      });
    }

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

  // Initialize debug output directory
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = initDebugOutput(runId);
  console.log(`Debug output: ${runDir}`);

  // Filter dataset
  let entries = dataset;

  if (options.questionTypes && options.questionTypes.length > 0) {
    entries = entries.filter((e) =>
      options.questionTypes!.includes(e.question_type)
    );
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

  console.log(`\nRunning LongMemEval benchmark (${options.variant} variant)`);
  console.log(`Total questions: ${entries.length}`);
  if (options.maxSessions) {
    console.log(`Max sessions per question: ${options.maxSessions}`);
  }
  console.log("");

  const results: LongMemEvalResult[] = [];
  const latencies: number[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(`[${i + 1}/${entries.length}] ${entry.question_id}`);

    try {
      const result = await processEntry(
        entry,
        api,
        options.verbose || false,
        options.maxSessions,
        runDir
      );
      results.push(result);
      latencies.push(result.latencyMs);

      console.log(
        `  ${result.isCorrect ? "✓" : "✗"} ${
          result.questionType
        } (${result.latencyMs.toFixed(0)}ms)`
      );
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

  const summary: LongMemEvalSummary = {
    timestamp: new Date().toISOString(),
    datasetName: `longmemeval_${options.variant}`,
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

  // Write run summary
  writeRunSummary(runDir, summary);
  console.log(`\nDebug output written to: ${runDir}`);

  return summary;
}
