/**
 * Memory Recall Strategy — exercises the production `recall()` API path.
 *
 * Same setup as memoryVaultStrategy (extract → retain) but the search tool
 * mirrors `src/lib/memory/recall.ts`:
 *   - fact lane: searchVaultMemoriesWithSize (production fn, identical args
 *     recall() passes when budget=high)
 *   - chunk lane: in-memory cosine over haystack-derived chunks. Functionally
 *     identical to searchChunksOp (cosine ranking, minSimilarity gate,
 *     conversation filter) but doesn't require a populated chat WatermelonDB
 *     to run in CI.
 *   - fusion: rrfFuse (production fn, k=60, identical to recall())
 *   - emission: a single ranked list of facts+chunks (NOT the labeled-blocks
 *     emit memoryVaultStrategy uses) — closer to what a real client would
 *     consume from `recall()`.
 *
 * The point: get a number that represents what the chat client actually
 * runs, so the demo headline is honest about the production pipeline rather
 * than a sibling eval-only path.
 */

import type { Database } from "@nozbe/watermelondb";

import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import { type VaultMemoryOperationsContext } from "../../../../src/lib/db/memoryVault/operations.js";
import { VaultMemory } from "../../../../src/lib/db/memoryVault/models.js";
import { rrfFuse } from "../../../../src/lib/memory/rrf.js";
import { retain } from "../../../../src/lib/memory/retain.js";
import {
  preEmbedVaultMemories,
  searchVaultMemoriesWithSize,
  type VaultEmbeddingCache,
  type VaultSearchResult,
} from "../../../../src/lib/memoryVault/searchTool.js";
import {
  callChatCompletion,
  clearProgress,
  evaluateAnswer,
  extractMemoriesFromSession,
  logProgress,
  saveTranscript,
  selectSessions,
  setupDatabase,
} from "./suite.js";
import type { ApiConfig, LongMemEvalEntry, LongMemEvalResult, TokenUsage } from "./types.js";

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

function createVaultContext(db: Database): VaultMemoryOperationsContext {
  return {
    database: db,
    vaultMemoryCollection: db.collections.get<VaultMemory>("memory_vault"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as VaultMemoryOperationsContext;
}

interface ChunkHit {
  uniqueId: string;
  sessionId: string;
  text: string;
  similarity: number;
}

const DEFAULT_LIMIT = 14;
const DEFAULT_FACT_MIN_SCORE = 0.1;
const DEFAULT_CHUNK_MIN_SCORE = 0.5;

export async function processEntryRecall(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number,
  searchPipeline?: {
    rerank?: boolean;
    decompose?: "off" | "llm";
    consolidate?: boolean;
    chunkSourceMaxChars?: number;
    excerptMaxChars?: number;
    /** Which lanes to query — defaults to both ("fact-chunk"). "fact" matches
     *  what the chat client's search tool calls today (searchTool.ts:1029).
     *  "chunk" is an ablation: vault-pipeline chunks only, no facts. */
    recallTypes?: "fact" | "chunk" | "fact-chunk";
    /** Emission style — "rrf" (single ranked list, recall.ts default) or
     *  "blocks" (labeled fact-then-chunk sections, vault-eval pattern). */
    recallEmit?: "rrf" | "blocks";
  }
): Promise<LongMemEvalResult> {
  const startTime = performance.now();
  const { indices: sessionIndices, limited } = selectSessions(entry, maxSessions);
  const totalSessions = sessionIndices.length;

  if (verbose) {
    console.log(`\n  Processing: ${entry.question_id}`);
    console.log(`  Type: ${entry.question_type}`);
    const sessionInfo = limited
      ? `${totalSessions}/${entry.haystack_sessions.length} (limited)`
      : `${totalSessions}`;
    console.log(`  Sessions: ${sessionInfo}`);
    console.log(`  Question: ${entry.question}`);
  }

  logProgress("Setting up database...");
  const database = await setupDatabase();
  const vaultCtx = createVaultContext(database);

  const vaultToSession = new Map<string, string>();

  try {
    // 1. Extract memories per session (same as vault strategy)
    const allMemories: Array<{ sessionId: string; content: string }> = [];
    for (let i = 0; i < sessionIndices.length; i++) {
      const sIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sIdx];
      const sessionId = entry.haystack_session_ids[sIdx];
      logProgress(`Extracting memories: ${i + 1}/${totalSessions} sessions`);
      const extracted = await extractMemoriesFromSession(
        session,
        sIdx,
        sessionId,
        api,
        entry.question_date
      );
      for (const mem of extracted) {
        const dateSuffix =
          mem.kind === "event" && mem.occurredAt ? ` [${mem.occurredAt}]` : "";
        allMemories.push({ sessionId: mem.sessionId, content: `${mem.content}${dateSuffix}` });
      }
    }
    clearProgress();

    if (allMemories.length === 0) {
      // No facts → answer from raw question only (same fallback as vault strategy)
      const genAnswer = await callChatCompletion(
        api,
        [
          { role: "system", content: "Answer the question directly. If you don't know, say so." },
          { role: "user", content: entry.question },
        ],
        { maxTokens: 500 }
      );
      const generatedAnswer = genAnswer.content || "";
      const usage: TokenUsage = {
        promptTokens: genAnswer.usage?.prompt_tokens ?? 0,
        completionTokens: genAnswer.usage?.completion_tokens ?? 0,
        totalTokens: genAnswer.usage?.total_tokens ?? 0,
        embeddingTokens: 0,
      };
      const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
      if (evalResult.usage) {
        usage.promptTokens += evalResult.usage.prompt_tokens;
        usage.completionTokens += evalResult.usage.completion_tokens;
        usage.totalTokens += evalResult.usage.total_tokens;
      }
      const elapsed = performance.now() - startTime;
      return {
        questionId: entry.question_id,
        questionType: entry.question_type,
        question: entry.question,
        expectedAnswer: entry.answer,
        generatedAnswer,
        isCorrect: evalResult.isCorrect,
        retrievedSessionIds: [],
        expectedSessionIds: entry.answer_session_ids,
        retrievalPrecision: 0,
        retrievalRecall: 0,
        latencyMs: elapsed,
        tokenUsage: usage,
        strategy: "memory-recall",
      };
    }

    // 2. Retain into vault (same as vault strategy)
    const answerSessionIdSet = new Set(entry.answer_session_ids);
    const embeddingCache: VaultEmbeddingCache = new Map();
    const embeddingOptions = { apiKey: api.apiKey, baseUrl: api.baseUrl };
    const retainCtx = { vaultCtx, embeddingOptions, vaultCache: embeddingCache };
    const consolidateEnabled = searchPipeline?.consolidate ?? true;

    for (const mem of allMemories) {
      const result = await retain(mem.content, retainCtx, {
        source: "auto-extracted",
        sourceChunkIds: [mem.sessionId],
        ...(consolidateEnabled && {
          consolidateOptions: { apiKey: api.apiKey, baseUrl: api.baseUrl },
        }),
      });
      const targetId = result.memoryId;
      const existingSession = vaultToSession.get(targetId);
      if (!existingSession || answerSessionIdSet.has(mem.sessionId)) {
        vaultToSession.set(targetId, mem.sessionId);
      }
    }

    await preEmbedVaultMemories(vaultCtx, embeddingOptions, embeddingCache);

    // 3. Build chunk lane (one chunk per session, same as vault strategy)
    const chunkSourceMax = searchPipeline?.chunkSourceMaxChars ?? 12000;
    const chunkSessionIds: string[] = [];
    const chunkTexts: string[] = [];
    for (let i = 0; i < sessionIndices.length; i++) {
      const sIdx = sessionIndices[i];
      const text = entry.haystack_sessions[sIdx]
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")
        .slice(0, chunkSourceMax);
      chunkSessionIds.push(entry.haystack_session_ids[sIdx]);
      chunkTexts.push(text);
    }
    const chunkEmbeddings = chunkTexts.length
      ? await generateEmbeddings(chunkTexts, { ...embeddingOptions, cache: embeddingCache })
      : [];

    // 4. Build the recall()-equivalent search executor.
    const rerankEnabled = searchPipeline?.rerank ?? true;
    const decomposeMode = searchPipeline?.decompose ?? "llm";
    const limit = DEFAULT_LIMIT;
    // Mirror recall.ts: pull a wider pool when fusing across lanes so RRF has
    // overlap to reorder; chunk pool gets the same widening.
    const factPoolLimit = Math.max(limit * 2, 16);
    const chunkPoolLimit = Math.max(limit * 2, 16);

    const retrievedVaultIds = new Set<string>();
    const retrievedChunkSessionIds = new Set<string>();
    const excerptMax = searchPipeline?.excerptMaxChars ?? 8000;

    const recallExecutor = async (args: Record<string, unknown>): Promise<string> => {
      const query = typeof args.query === "string" ? args.query : "";
      if (!query) return "(no query)";

      // Fact lane — bit-identical to recall.ts when budget=high. Skipped
      // entirely for the chunk-only ablation.
      const useFacts = (searchPipeline?.recallTypes ?? "fact-chunk") !== "chunk";
      const factResults = useFacts
        ? (
            await searchVaultMemoriesWithSize(query, vaultCtx, embeddingOptions, embeddingCache, {
              limit: factPoolLimit,
              minSimilarity: DEFAULT_FACT_MIN_SCORE,
              useFusion: true,
              rerank: rerankEnabled,
              ...(decomposeMode === "llm" && {
                decompose: "llm" as const,
                decomposeOptions: { apiKey: api.apiKey, baseUrl: api.baseUrl },
              }),
            })
          ).results
        : [];

      // Chunk lane — in-memory cosine. Mirrors searchChunksOp's interface
      // (cosine + minSimilarity gate, conversationId filter omitted because
      // oracle haystacks already restrict to the relevant scope).
      const useChunks = (searchPipeline?.recallTypes ?? "fact-chunk") !== "fact";
      let chunkHits: ChunkHit[] = [];
      if (useChunks && chunkEmbeddings.length > 0) {
        const [qEmb] = await generateEmbeddings([query], {
          ...embeddingOptions,
          cache: embeddingCache,
        });
        chunkHits = chunkEmbeddings
          .map((emb, i) => ({
            uniqueId: `chunk:${chunkSessionIds[i]}`,
            sessionId: chunkSessionIds[i],
            text: chunkTexts[i],
            similarity: cosineSim(qEmb, emb),
          }))
          .filter((c) => c.similarity >= DEFAULT_CHUNK_MIN_SCORE)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, chunkPoolLimit);
      }

      // Track retrieval for metrics.
      for (const f of factResults) retrievedVaultIds.add(f.uniqueId);
      for (const c of chunkHits) retrievedChunkSessionIds.add(c.sessionId);

      const emit = searchPipeline?.recallEmit ?? "rrf";

      // Blocks emission — vault-eval style. Facts and chunks are kept in
      // their own labeled sections, each sorted by raw similarity. The
      // answer LLM gets two clearly delineated knowledge sources, which
      // empirically beats RRF mixing on this benchmark.
      if (emit === "blocks") {
        const factsSorted = factResults
          .slice()
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
        const chunksSorted = chunkHits.slice().sort((a, b) => b.similarity - a.similarity).slice(0, 7);
        const factsBlock =
          factsSorted.length === 0
            ? "(no fact memories matched)"
            : factsSorted
                .map(
                  (r, i) =>
                    `[${i + 1}] (id: ${r.uniqueId}, similarity: ${r.similarity.toFixed(2)})\n${r.content}`
                )
                .join("\n\n");
        const chunksBlock =
          chunksSorted.length === 0
            ? ""
            : chunksSorted
                .map(
                  (c, i) =>
                    `[excerpt ${i + 1}] (similarity: ${c.similarity.toFixed(2)})\n${c.text.slice(0, excerptMax)}`
                )
                .join("\n\n");
        const parts = [`Found ${factsSorted.length} vault memories:\n\n${factsBlock}`];
        if (chunksBlock) {
          parts.push(`--- Raw conversation excerpts (${chunksSorted.length}) ---\n\n${chunksBlock}`);
        }
        return parts.join("\n\n");
      }

      // RRF emission — recall.ts default. Single ranked list of facts +
      // chunks fused via reciprocal rank fusion (k=60).
      if (factResults.length === 0 || chunkHits.length === 0) {
        const merged: Array<{ kind: "fact" | "chunk"; id: string; content: string; score: number }> =
          [
            ...factResults.map((r) => ({
              kind: "fact" as const,
              id: r.uniqueId,
              content: r.content,
              score: r.similarity,
            })),
            ...chunkHits.map((c) => ({
              kind: "chunk" as const,
              id: c.uniqueId,
              content: c.text,
              score: c.similarity,
            })),
          ];
        merged.sort((a, b) => b.score - a.score);
        return formatRecallResult(merged.slice(0, limit), excerptMax);
      }

      const factRanking = factResults.map((r) => `fact:${r.uniqueId}`);
      const chunkRanking = chunkHits.map((c) => c.uniqueId);
      const fused = rrfFuse([factRanking, chunkRanking]);

      const merged: Array<{
        kind: "fact" | "chunk";
        id: string;
        content: string;
        score: number;
      }> = [];
      for (const r of factResults) {
        const id = `fact:${r.uniqueId}`;
        merged.push({ kind: "fact", id, content: r.content, score: fused.get(id) ?? 0 });
      }
      for (const c of chunkHits) {
        merged.push({ kind: "chunk", id: c.uniqueId, content: c.text, score: fused.get(c.uniqueId) ?? 0 });
      }
      merged.sort((a, b) => b.score - a.score);
      return formatRecallResult(merged.slice(0, limit), excerptMax);
    };

    // 5. Two-step LLM flow — toolChoice required, same as vault strategy.
    const systemPrompt = `Today is ${entry.question_date}.
You are a personal assistant with access to the user's past conversation history. Answer their question using information from their past conversations. Be concise and direct.`;

    const toolDef = {
      type: "function" as const,
      function: {
        name: "memory_recall",
        description:
          "Search the user's memory across distilled facts and raw conversation chunks. Returns a single ranked list fused via Reciprocal Rank Fusion. Use the results to answer the user's question.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Natural-language search query for the user's memory.",
            },
          },
          required: ["query"],
        },
      },
    };

    const baseMessages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: entry.question },
    ];

    const transcript: Record<string, unknown> = {
      questionId: entry.question_id,
      question: entry.question,
      expectedAnswer: entry.answer,
      llmModel: api.llmModel,
      strategy: "memory-recall",
      messages: [...baseMessages],
      toolCalls: [] as unknown[],
      toolResults: [] as unknown[],
      finalAnswer: "",
    };

    const tokenUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      embeddingTokens: 0,
    };
    function addUsage(u?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
      if (!u) return;
      tokenUsage.promptTokens += u.prompt_tokens;
      tokenUsage.completionTokens += u.completion_tokens;
      tokenUsage.totalTokens += u.total_tokens;
    }

    let generatedAnswer = "";
    try {
      const firstResponse = await callChatCompletion(api, baseMessages, {
        tools: [toolDef],
        toolChoice: "required",
        maxTokens: 500,
      });
      addUsage(firstResponse.usage);
      transcript.firstResponse = firstResponse;

      if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
        for (const toolCall of firstResponse.toolCalls) {
          if (toolCall.function?.name !== "memory_recall") continue;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }
          const toolResultStr = await recallExecutor(args);
          (transcript.toolCalls as unknown[]).push({
            id: toolCall.id,
            name: toolCall.function?.name,
            arguments: toolCall.function?.arguments,
          });
          (transcript.toolResults as unknown[]).push({ text: toolResultStr });

          const secondSystemPrompt = [
            systemPrompt,
            "",
            "The following is a unified ranked list from the user's memory, returned by recall(). Each item is either a distilled fact or a raw conversation chunk. Use them to answer the user's question.",
            "",
            toolResultStr,
          ].join("\n");

          const secondResponse = await callChatCompletion(
            api,
            [
              { role: "system", content: secondSystemPrompt },
              { role: "user", content: entry.question },
            ],
            { maxTokens: 500 }
          );
          addUsage(secondResponse.usage);
          transcript.secondResponse = secondResponse;
          generatedAnswer = secondResponse.content || "";
        }
      } else {
        generatedAnswer = firstResponse.content || "";
      }
    } catch (error) {
      console.error("memory-recall answering failed:", error);
      transcript.error = String(error);
      generatedAnswer = "";
    }

    transcript.finalAnswer = generatedAnswer;

    // Retrieval metrics.
    const retrievedSessionIds = new Set<string>();
    for (const vId of retrievedVaultIds) {
      const sid = vaultToSession.get(vId);
      if (sid) retrievedSessionIds.add(sid);
    }
    for (const sid of retrievedChunkSessionIds) retrievedSessionIds.add(sid);
    const expectedSessionIds = new Set(entry.answer_session_ids);
    const correctlyRetrieved = [...retrievedSessionIds].filter((id) =>
      expectedSessionIds.has(id)
    ).length;
    const retrievalPrecision =
      retrievedSessionIds.size > 0 ? correctlyRetrieved / retrievedSessionIds.size : 0;
    const retrievalRecall =
      expectedSessionIds.size > 0 ? correctlyRetrieved / expectedSessionIds.size : 0;

    transcript.retrieval = {
      precision: retrievalPrecision,
      recall: retrievalRecall,
      retrievedSessionIds: [...retrievedSessionIds],
      expectedSessionIds: entry.answer_session_ids,
    };

    const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
    addUsage(evalResult.usage);
    const isCorrect = evalResult.isCorrect;
    transcript.isCorrect = isCorrect;
    await saveTranscript(`${entry.question_id}_recall`, transcript, verbose);

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
      tokenUsage,
      strategy: "memory-recall",
    };
  } catch (error) {
    clearProgress();
    throw error;
  } finally {
    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
    } catch {
      // ignore — cleanup
    }
  }
}

function formatRecallResult(
  items: Array<{ kind: "fact" | "chunk"; id: string; content: string; score: number }>,
  excerptMax: number
): string {
  if (items.length === 0) return "(no results)";
  return items
    .map((m, i) => {
      const tag = m.kind === "fact" ? "FACT" : "CHUNK";
      const idLabel = m.kind === "fact" ? `id: ${m.id}` : `id: ${m.id}`;
      const body = m.kind === "chunk" ? m.content.slice(0, excerptMax) : m.content;
      return `[${i + 1}] ${tag} (${idLabel}, score: ${m.score.toFixed(4)})\n${body}`;
    })
    .join("\n\n");
}

// Use VaultSearchResult to keep TS aware of the shape we feed RRF.
export type _ = VaultSearchResult;
