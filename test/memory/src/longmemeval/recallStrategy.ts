/**
 * Memory Recall Strategy — production-equivalent.
 *
 * Calls the real `src/lib/memory/recall.ts` API end-to-end against a
 * populated WatermelonDB (vault + chat storage). This is what the chat
 * client *would* run if it called `recall(types=["fact","chunk"])` —
 * not an eval-side simulation.
 *
 * Setup mirrors both peer strategies:
 *  - vault: extract facts → retain() with consolidation (memoryVaultStrategy)
 *  - chat storage: createConversationOp + createMessageOp +
 *    chunkAndEmbedAllMessages — message-granular chunks indexed for
 *    searchChunksOp (memoryEngineStrategy)
 *
 * Then a single `recall(query, ctx, { types: ["fact","chunk"], budget,
 * limit, ... })` call drives both lanes; results come back as
 * RankedMemory[] with kind discriminator. We emit them as labeled
 * blocks (vault eval pattern) — this beat RRF on accuracy in earlier
 * sweeps.
 */

import type { Database } from "@nozbe/watermelondb";

import {
  createConversationOp,
  createMessageOp,
  type StorageOperationsContext,
} from "../../../../src/lib/db/chat/operations.js";
import { Conversation, Message } from "../../../../src/lib/db/chat/models.js";
import { type VaultMemoryOperationsContext } from "../../../../src/lib/db/memoryVault/operations.js";
import { VaultMemory } from "../../../../src/lib/db/memoryVault/models.js";
import { chunkAndEmbedAllMessages } from "../../../../src/lib/memoryEngine/embeddings.js";
import { recall } from "../../../../src/lib/memory/recall.js";
import { retain } from "../../../../src/lib/memory/retain.js";
import {
  preEmbedVaultMemories,
  type VaultEmbeddingCache,
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

function createVaultContext(db: Database): VaultMemoryOperationsContext {
  return {
    database: db,
    vaultMemoryCollection: db.collections.get<VaultMemory>("memory_vault"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as VaultMemoryOperationsContext;
}

function createStorageContext(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.collections.get<Message>("history"),
    conversationsCollection: db.collections.get<Conversation>("conversations"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as StorageOperationsContext;
}

const DEFAULT_LIMIT = 14;
const DEFAULT_FACT_MIN_SCORE = 0.1;

export async function processEntryRecall(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number,
  searchPipeline?: {
    rerank?: boolean;
    decompose?: "off" | "llm";
    consolidate?: boolean;
    chunkSourceMaxChars?: number; // unused by prod path; chunks come from chunkAndEmbedAllMessages
    excerptMaxChars?: number;
    /** Lanes to query — passed straight to recall(). Default "fact-chunk". */
    recallTypes?: "fact" | "chunk" | "fact-chunk";
    /** Emission style. "blocks" beat RRF on earlier sweeps. Default "blocks". */
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
  const storageCtx = createStorageContext(database);

  const vaultToSession = new Map<string, string>();
  const convToSession = new Map<string, string>();

  const tokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    embeddingTokens: 0,
  };

  try {
    // 1a. Extract memories per session (vault setup)
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

    // 1b. Store sessions as conversations + messages (chat storage setup,
    // engine-style). This is what enables searchChunksOp via recall.
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

    // 2a. Embedding options shared by retain() / chunkAndEmbedAllMessages /
    // recall(). The onUsage hook accumulates embedding tokens for cost reporting.
    const embeddingOptions = {
      apiKey: api.apiKey,
      baseUrl: api.baseUrl,
      onUsage: (usage: { promptTokens: number; totalTokens: number }) => {
        tokenUsage.embeddingTokens += usage.totalTokens;
      },
    };

    // 2b. Chunk + embed all messages (engine pipeline). Populates message-level
    // chunks in chat storage that recall()'s chunk lane will read via
    // searchChunksOp.
    logProgress("Chunking and embedding messages...");
    const embeddedCount = await chunkAndEmbedAllMessages(storageCtx, embeddingOptions);
    clearProgress();
    if (verbose) {
      console.log(`  Embedded ${embeddedCount} messages (chat storage chunks)`);
    }

    // 2c. Retain extracted facts into vault — same pipeline memoryVaultStrategy
    // uses (auto-merge, optional Hindsight consolidation).
    if (allMemories.length > 0) {
      const answerSessionIdSet = new Set(entry.answer_session_ids);
      const embeddingCache: VaultEmbeddingCache = new Map();
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

      // 3. Build the answer LLM tool whose executor calls real recall().
      const recallTypes = searchPipeline?.recallTypes ?? "fact-chunk";
      const types: Array<"fact" | "chunk"> =
        recallTypes === "fact"
          ? ["fact"]
          : recallTypes === "chunk"
            ? ["chunk"]
            : ["fact", "chunk"];
      const decomposeEnabled = (searchPipeline?.decompose ?? "llm") === "llm";
      const rerankEnabled = searchPipeline?.rerank ?? true;
      const budget: "low" | "mid" | "high" = decomposeEnabled
        ? "high"
        : rerankEnabled
          ? "mid"
          : "low";
      const emit = searchPipeline?.recallEmit ?? "blocks";
      const excerptMax = searchPipeline?.excerptMaxChars ?? 8000;

      const retrievedVaultIds = new Set<string>();
      const retrievedChunkConvIds = new Set<string>();

      const recallExecutor = async (args: Record<string, unknown>): Promise<string> => {
        const query = typeof args.query === "string" ? args.query : "";
        if (!query) return "(no query)";
        const result = await recall(
          query,
          { vaultCtx, storageCtx, embeddingOptions, vaultCache: embeddingCache },
          {
            types,
            limit: DEFAULT_LIMIT,
            minScore: DEFAULT_FACT_MIN_SCORE,
            budget,
            ...(decomposeEnabled && {
              decomposeOptions: { apiKey: api.apiKey, baseUrl: api.baseUrl },
            }),
          }
        );

        for (const m of result.memories) {
          if (m.kind === "fact") retrievedVaultIds.add(m.id);
          if (m.kind === "chunk" && m.conversationId) retrievedChunkConvIds.add(m.conversationId);
        }

        if (emit === "blocks") {
          const facts = result.memories.filter((m) => m.kind === "fact");
          const chunks = result.memories.filter((m) => m.kind === "chunk");
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

        // RRF emission — single ranked list with per-item kind tag.
        return result.memories
          .map((m, i) => {
            const tag = m.kind === "fact" ? "FACT" : "CHUNK";
            const body = m.kind === "chunk" ? m.content.slice(0, excerptMax) : m.content;
            return `[${i + 1}] ${tag} (id: ${m.id}, score: ${m.score.toFixed(4)})\n${body}`;
          })
          .join("\n\n");
      };

      // 4. Two-step LLM flow — toolChoice required, single shot.
      const systemPrompt = `Today is ${entry.question_date}.
You are a personal assistant with access to the user's past conversation history. Answer their question using information from their past conversations. Be concise and direct.`;

      const toolDef = {
        type: "function" as const,
        function: {
          name: "memory_recall",
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
    }

    // No memories extracted — fallback path: still try recall() with chunks
    // only (chat storage was populated regardless of extraction success).
    const fallbackTypes: Array<"chunk"> = ["chunk"];
    const fallbackResult = await recall(
      entry.question,
      { storageCtx, embeddingOptions },
      { types: fallbackTypes, limit: DEFAULT_LIMIT, minScore: 0.5, budget: "low" }
    );
    const fallbackContext = fallbackResult.memories
      .map((m, i) => `[${i + 1}] ${m.content.slice(0, 4000)}`)
      .join("\n\n");
    const genAnswer = await callChatCompletion(
      api,
      [
        {
          role: "system",
          content: `Today is ${entry.question_date}.\nUse the following excerpts to answer.\n\n${fallbackContext}`,
        },
        { role: "user", content: entry.question },
      ],
      { maxTokens: 500 }
    );
    const generatedAnswer = genAnswer.content || "";
    const earlyUsage: TokenUsage = {
      promptTokens: genAnswer.usage?.prompt_tokens ?? 0,
      completionTokens: genAnswer.usage?.completion_tokens ?? 0,
      totalTokens: genAnswer.usage?.total_tokens ?? 0,
      embeddingTokens: tokenUsage.embeddingTokens,
    };
    const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
    if (evalResult.usage) {
      earlyUsage.promptTokens += evalResult.usage.prompt_tokens;
      earlyUsage.completionTokens += evalResult.usage.completion_tokens;
      earlyUsage.totalTokens += evalResult.usage.total_tokens;
    }
    earlyUsage.totalTokens += earlyUsage.embeddingTokens;
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
      tokenUsage: earlyUsage,
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
