/**
 * Calls the real `src/lib/memory/recall.ts` API end-to-end against a
 * populated WatermelonDB (vault + chat storage). Both lanes drive a single
 * `recall(query, ctx, { types: ["fact","chunk"], ... })` call, and results
 * come back as `RankedMemory[]` with a `kind` discriminator.
 */

import { createConversationOp, createMessageOp } from "../../../../src/lib/db/chat/operations.js";
import { linkMemoryEntitiesOp } from "../../../../src/lib/db/entities/operations.js";
import { chunkAndEmbedAllMessages } from "../../../../src/lib/memoryEngine/embeddings.js";
import { recall } from "../../../../src/lib/memory/recall.js";
import { RECALL_TOOL_NAME } from "../../../../src/lib/memory/recallTool.js";
import { retain } from "../../../../src/lib/memory/retain.js";
import {
  preEmbedVaultMemories,
  type VaultEmbeddingCache,
} from "../../../../src/lib/memoryVault/searchTool.js";
import {
  callChatCompletion,
  clearProgress,
  createEntityContext,
  createStorageContext,
  createVaultContext,
  evaluateAnswer,
  extractMemoriesFromSession,
  logProgress,
  saveTranscript,
  selectSessions,
  setupDatabase,
} from "./suite.js";
import type {
  ApiConfig,
  LongMemEvalEntry,
  LongMemEvalResult,
  RecallEmit,
  RecallLaneMode,
  RecallTypes,
  TokenUsage,
} from "./types.js";

const DEFAULT_LIMIT = 14;
const DEFAULT_CHUNK_LANE_LIMIT = 7;
const DEFAULT_FACT_MIN_SCORE = 0.1;

const TYPES_BY_FLAG: Record<RecallTypes, Array<"fact" | "chunk">> = {
  fact: ["fact"],
  chunk: ["chunk"],
  "fact-chunk": ["fact", "chunk"],
};

function budgetFor(decompose: boolean, rerank: boolean): "low" | "mid" | "high" {
  if (decompose) return "high";
  if (rerank) return "mid";
  return "low";
}

export async function processEntryRecall(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number,
  searchPipeline?: {
    rerank?: boolean;
    decompose?: "off" | "llm";
    consolidate?: boolean;
    excerptMaxChars?: number;
    recallTypes?: RecallTypes;
    recallEmit?: RecallEmit;
    recallLaneMode?: RecallLaneMode;
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
  const storageCtx = createStorageContext(database);
  const entityCtx = createEntityContext(database);

  const vaultToSession = new Map<string, string>();
  const convToSession = new Map<string, string>();

  const tokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    embeddingTokens: 0,
  };

  function addUsage(u?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }) {
    if (!u) return;
    tokenUsage.promptTokens += u.prompt_tokens;
    tokenUsage.completionTokens += u.completion_tokens;
    tokenUsage.totalTokens += u.total_tokens;
  }

  try {
    const allMemories: Array<{
      sessionId: string;
      content: string;
      kind: "state" | "event";
      occurredAt: string | null;
      entities: string[];
    }> = [];
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
        const dateSuffix = mem.kind === "event" && mem.occurredAt ? ` [${mem.occurredAt}]` : "";
        allMemories.push({
          sessionId: mem.sessionId,
          content: `${mem.content}${dateSuffix}`,
          kind: mem.kind,
          occurredAt: mem.occurredAt ?? null,
          entities: mem.entities ?? [],
        });
      }
    }
    clearProgress();

    logProgress("Storing sessions as messages...");
    for (let i = 0; i < sessionIndices.length; i++) {
      const sIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sIdx];
      const sessionId = entry.haystack_session_ids[sIdx];
      const conversation = await createConversationOp(storageCtx, {
        title: `Session ${sessionId}`,
      });
      convToSession.set(conversation.conversationId, sessionId);
      for (const msg of session) {
        await createMessageOp(storageCtx, {
          conversationId: conversation.conversationId,
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }
    clearProgress();

    const embeddingOptions = {
      apiKey: api.apiKey,
      baseUrl: api.baseUrl,
      onUsage: (usage: { promptTokens: number; totalTokens: number }) => {
        tokenUsage.embeddingTokens += usage.totalTokens;
      },
    };

    logProgress("Chunking and embedding messages...");
    const embeddedCount = await chunkAndEmbedAllMessages(storageCtx, embeddingOptions);
    clearProgress();
    if (verbose) {
      console.log(`  Embedded ${embeddedCount} messages (chat storage chunks)`);
    }

    if (allMemories.length === 0) {
      // No vault facts extracted — answer from chunks alone via recall().
      return await answerFromChunksOnly(
        entry,
        api,
        storageCtx,
        embeddingOptions,
        tokenUsage,
        startTime
      );
    }

    const answerSessionIdSet = new Set(entry.answer_session_ids);
    const embeddingCache: VaultEmbeddingCache = new Map();
    const retainCtx = { vaultCtx, embeddingOptions, vaultCache: embeddingCache };
    const consolidateEnabled = searchPipeline?.consolidate ?? true;

    for (const mem of allMemories) {
      // W6 temporal lane — propagate the bench's `kind: 'event' | 'state'`
      // + `occurredAt` (YYYY-MM-DD) into retain's `eventTime` shape so
      // memory_vault.event_time_* columns get populated. The recall path
      // then has a non-empty memory_vault to query for time-windowed
      // results. State memories have no temporal anchor and stay null.
      let eventTime: { kind: "point"; start: number; end: null } | undefined;
      if (mem.kind === "event" && mem.occurredAt) {
        const ms = Date.parse(mem.occurredAt);
        if (Number.isFinite(ms)) {
          eventTime = { kind: "point", start: ms, end: null };
        }
      }
      const result = await retain(mem.content, retainCtx, {
        source: "auto-extracted",
        sourceChunkIds: [mem.sessionId],
        ...(consolidateEnabled && {
          consolidateOptions: { apiKey: api.apiKey, baseUrl: api.baseUrl },
        }),
        ...(eventTime && { eventTime }),
      });
      const targetId = result.memoryId;
      const existingSession = vaultToSession.get(targetId);
      if (!existingSession || answerSessionIdSet.has(mem.sessionId)) {
        vaultToSession.set(targetId, mem.sessionId);
      }
      // W5 graph lane — link the extracted entities so memory_entity rows
      // exist for recall's graph-lane lookup. Best-effort; failures don't
      // block the bench because the fact + chunk lanes still answer.
      if (mem.entities.length > 0) {
        try {
          await linkMemoryEntitiesOp(entityCtx, targetId, mem.entities);
        } catch {
          /* swallow — graph lane gracefully degrades */
        }
      }
    }
    await preEmbedVaultMemories(vaultCtx, embeddingOptions, embeddingCache);

    const types = TYPES_BY_FLAG[searchPipeline?.recallTypes ?? "fact-chunk"];
    const decomposeEnabled = (searchPipeline?.decompose ?? "llm") === "llm";
    const rerankEnabled = searchPipeline?.rerank ?? true;
    const budget = budgetFor(decomposeEnabled, rerankEnabled);
    const emit: RecallEmit = searchPipeline?.recallEmit ?? "blocks";
    const excerptMax = searchPipeline?.excerptMaxChars ?? 8000;
    const laneMode: RecallLaneMode = searchPipeline?.recallLaneMode ?? "fused";
    const wantsBothLanes = types.includes("fact") && types.includes("chunk");
    const usePerLane = laneMode === "per-lane" && wantsBothLanes;

    const retrievedVaultIds = new Set<string>();
    const retrievedChunkConvIds = new Set<string>();

    const recallCtx = {
      vaultCtx,
      storageCtx,
      embeddingOptions,
      vaultCache: embeddingCache,
      // W5 graph lane — recall extracts query entities and looks up
      // memories sharing them, RRF-fused with cosine + BM25. No-op when
      // memory_entity is empty (e.g. older bench runs without entity
      // extraction in the prompt).
      entityCtx,
    };
    const decomposeOpts = decomposeEnabled
      ? { decomposeOptions: { apiKey: api.apiKey, baseUrl: api.baseUrl } }
      : {};

    const recallExecutor = async (args: Record<string, unknown>): Promise<string> => {
      const query = typeof args.query === "string" ? args.query : "";
      if (!query) return "(no query)";

      // Per-lane: separate calls so chunks don't compete with facts for
      // a shared limit. Each lane gets its own pool. Skip when the fused
      // path is taken — the single fused recall() below covers both
      // kinds, so a separate fact-only call would just throw the result away.
      const factResults =
        usePerLane && types.includes("fact")
          ? (
              await recall(query, recallCtx, {
                types: ["fact"],
                limit: DEFAULT_LIMIT,
                minScore: DEFAULT_FACT_MIN_SCORE,
                budget,
                ...decomposeOpts,
              })
            ).memories
          : [];

      const chunkResults = usePerLane
        ? (
            await recall(query, recallCtx, {
              types: ["chunk"],
              limit: DEFAULT_CHUNK_LANE_LIMIT,
              budget,
              ...decomposeOpts,
            })
          ).memories
        : [];

      // Fused path: single recall() call returns both kinds via RRF
      const fused = !usePerLane
        ? (
            await recall(query, recallCtx, {
              types,
              limit: DEFAULT_LIMIT,
              minScore: DEFAULT_FACT_MIN_SCORE,
              budget,
              ...decomposeOpts,
            })
          ).memories
        : [];

      const allMemories = usePerLane ? [...factResults, ...chunkResults] : fused;

      for (const m of allMemories) {
        if (m.kind === "fact") retrievedVaultIds.add(m.id);
        if (m.kind === "chunk" && m.conversationId) retrievedChunkConvIds.add(m.conversationId);
      }

      if (emit === "blocks") {
        const facts = usePerLane ? factResults : fused.filter((m) => m.kind === "fact");
        const chunks = usePerLane ? chunkResults : fused.filter((m) => m.kind === "chunk");
        const factsBlock =
          facts.length === 0
            ? "(no fact memories matched)"
            : facts
                .map(
                  (m, i) =>
                    `[${i + 1}] (id: ${m.id}, similarity: ${(m.scoreBreakdown?.cosine ?? m.score).toFixed(2)})\n${m.content}`
                )
                .join("\n\n");
        const chunksBlock = chunks
          .map(
            (m, i) =>
              `[excerpt ${i + 1}] (similarity: ${(m.scoreBreakdown?.cosine ?? m.score).toFixed(2)})\n${m.content.slice(0, excerptMax)}`
          )
          .join("\n\n");
        const parts = [`Found ${facts.length} vault memories:\n\n${factsBlock}`];
        if (chunksBlock) {
          parts.push(`--- Raw conversation excerpts (${chunks.length}) ---\n\n${chunksBlock}`);
        }
        return parts.join("\n\n");
      }

      return allMemories
        .map((m, i) => {
          const tag = m.kind === "fact" ? "FACT" : "CHUNK";
          const body = m.kind === "chunk" ? m.content.slice(0, excerptMax) : m.content;
          return `[${i + 1}] ${tag} (id: ${m.id}, score: ${m.score.toFixed(4)})\n${body}`;
        })
        .join("\n\n");
    };

    const systemPrompt = `Today is ${entry.question_date}.
You are a personal assistant with access to the user's past conversation history. Answer their question using information from their past conversations. Be concise and direct.`;

    const toolDef = {
      type: "function" as const,
      function: {
        name: RECALL_TOOL_NAME,
        description:
          "Search the user's memory across distilled facts and raw conversation chunks. Use the results to answer the user's question.",
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
          if (toolCall.function?.name !== RECALL_TOOL_NAME) continue;
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
            "The following are entries from the user's memory, retrieved by recall(). Use them to answer the user's question.",
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

    const retrievedSessionIds = new Set<string>();
    for (const vId of retrievedVaultIds) {
      const sid = vaultToSession.get(vId);
      if (sid) retrievedSessionIds.add(sid);
    }
    for (const cId of retrievedChunkConvIds) {
      const sid = convToSession.get(cId);
      if (sid) retrievedSessionIds.add(sid);
    }
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

    tokenUsage.totalTokens += tokenUsage.embeddingTokens;

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
      // best-effort cleanup
    }
  }
}

async function answerFromChunksOnly(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  storageCtx: ReturnType<typeof createStorageContext>,
  embeddingOptions: {
    apiKey: string;
    baseUrl?: string;
    onUsage: (u: { promptTokens: number; totalTokens: number }) => void;
  },
  tokenUsage: TokenUsage,
  startTime: number
): Promise<LongMemEvalResult> {
  const result = await recall(
    entry.question,
    { storageCtx, embeddingOptions },
    { types: ["chunk"], limit: DEFAULT_LIMIT, minScore: 0.5, budget: "low" }
  );
  const context = result.memories
    .map((m, i) => `[${i + 1}] ${m.content.slice(0, 4000)}`)
    .join("\n\n");
  const genAnswer = await callChatCompletion(
    api,
    [
      {
        role: "system",
        content: `Today is ${entry.question_date}.\nUse the following excerpts to answer.\n\n${context}`,
      },
      { role: "user", content: entry.question },
    ],
    { maxTokens: 500 }
  );
  const generatedAnswer = genAnswer.content || "";
  if (genAnswer.usage) {
    tokenUsage.promptTokens += genAnswer.usage.prompt_tokens;
    tokenUsage.completionTokens += genAnswer.usage.completion_tokens;
    tokenUsage.totalTokens += genAnswer.usage.total_tokens;
  }
  const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
  if (evalResult.usage) {
    tokenUsage.promptTokens += evalResult.usage.prompt_tokens;
    tokenUsage.completionTokens += evalResult.usage.completion_tokens;
    tokenUsage.totalTokens += evalResult.usage.total_tokens;
  }
  tokenUsage.totalTokens += tokenUsage.embeddingTokens;
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
    latencyMs: performance.now() - startTime,
    tokenUsage,
    strategy: "memory-recall",
  };
}
