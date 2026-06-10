/**
 * Ensemble strategy — exposes BOTH `memory_vault_search` (vault facts via
 * the unified recall API) AND `search_memory` (engine chunk retrieval) to
 * the answer LLM as separate tools. The model picks which to call per
 * query (`toolChoice: "required"` — it must call at least one).
 *
 * This mirrors what the production chat client does on main today
 * (apps/web/hooks/useChatSetup.tsx wires both tools per turn). Single-
 * strategy evals (vault, engine) under-measure the live experience because
 * they don't capture the LLM's per-question routing.
 */

import { createConversationOp, createMessageOp } from "../../../../src/lib/db/chat/operations.js";
import { chunkAndEmbedAllMessages } from "../../../../src/lib/memoryEngine/embeddings.js";
import { createMemoryEngineTool } from "../../../../src/lib/memoryEngine/tool.js";
import { retain } from "../../../../src/lib/memory/retain.js";
import {
  createMemoryVaultSearchTool,
  preEmbedVaultMemories,
  type VaultEmbeddingCache,
} from "../../../../src/lib/memoryVault/searchTool.js";
import {
  callChatCompletion,
  clearProgress,
  createConsolidationFallbackTracker,
  createStorageContext,
  createVaultContext,
  evaluateAnswer,
  extractMemoriesFromSession,
  formatHaystackDateAsObservation,
  logProgress,
  saveTranscript,
  selectSessions,
  setupDatabase,
} from "./suite.js";
import type { ApiConfig, LongMemEvalEntry, LongMemEvalResult, TokenUsage } from "./types.js";

const DEFAULT_VAULT_LIMIT = 14;
const DEFAULT_ENGINE_TOPK = 12;

export async function processEntryEnsemble(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number,
  searchPipeline?: {
    rerank?: boolean;
    decompose?: "off" | "llm";
    consolidate?: boolean;
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
    // Vault side: extract → retain
    const allMemories: Array<{ sessionId: string; content: string }> = [];
    for (let i = 0; i < sessionIndices.length; i++) {
      const sIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sIdx];
      const sessionId = entry.haystack_session_ids[sIdx];
      logProgress(`Extracting memories: ${i + 1}/${totalSessions} sessions`);
      // Anchor relative-date resolution to the session's own date, not
      // entry.question_date — collapsing all observations onto the
      // question date was the 51%-of-misses temporal failure mode.
      const sessionDate = formatHaystackDateAsObservation(entry.haystack_dates[sIdx]);
      const extracted = await extractMemoriesFromSession(
        session,
        sIdx,
        sessionId,
        api,
        sessionDate
      );
      for (const mem of extracted) {
        const dateSuffix = mem.kind === "event" && mem.occurredAt ? ` [${mem.occurredAt}]` : "";
        allMemories.push({ sessionId: mem.sessionId, content: `${mem.content}${dateSuffix}` });
      }
    }
    clearProgress();

    // Engine side: store messages → chunkAndEmbedAllMessages
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

    // Retain extracted facts into vault.
    const embeddingCache: VaultEmbeddingCache = new Map();
    if (allMemories.length > 0) {
      const answerSessionIdSet = new Set(entry.answer_session_ids);
      const retainCtx = { vaultCtx, embeddingOptions, vaultCache: embeddingCache };
      const consolidateEnabled = searchPipeline?.consolidate ?? true;
      const fallbackTracker = createConsolidationFallbackTracker();

      for (const mem of allMemories) {
        const result = await retain(mem.content, retainCtx, {
          source: "auto-extracted",
          sourceChunkIds: [mem.sessionId],
          ...(consolidateEnabled && {
            consolidateOptions: {
              apiKey: api.apiKey,
              baseUrl: api.baseUrl,
              onFallback: fallbackTracker.onFallback,
            },
          }),
        });
        const targetId = result.memoryId;
        const existingSession = vaultToSession.get(targetId);
        if (!existingSession || answerSessionIdSet.has(mem.sessionId)) {
          vaultToSession.set(targetId, mem.sessionId);
        }
      }
      fallbackTracker.report(entry.question_id);
      await preEmbedVaultMemories(vaultCtx, embeddingOptions, embeddingCache);
    }

    // Build both tools, exactly as the chat client does in
    // apps/web/hooks/useChatSetup.tsx (vault search + engine search).
    const rerankEnabled = searchPipeline?.rerank ?? true;
    const decomposeMode = searchPipeline?.decompose ?? "llm";

    const retrievedVaultIds = new Set<string>();
    const retrievedConvIds = new Set<string>();

    const vaultTool = createMemoryVaultSearchTool(vaultCtx, embeddingOptions, embeddingCache, {
      limit: DEFAULT_VAULT_LIMIT,
      minSimilarity: 0.1,
      rerank: rerankEnabled,
      decompose: decomposeMode,
      ...(decomposeMode === "llm" && {
        decomposeOptions: { apiKey: api.apiKey, baseUrl: api.baseUrl },
      }),
    });

    const engineTool = createMemoryEngineTool(
      storageCtx,
      embeddingOptions,
      { topK: DEFAULT_ENGINE_TOPK, minSimilarity: 0.1, includeAssistant: true },
      {
        onRetrieve: (convIds) => {
          for (const id of convIds) retrievedConvIds.add(id);
        },
      }
    );

    // Wrap vault executor so we can capture vault entry IDs from the result
    // text (same pattern as memoryVaultStrategy).
    const vaultExecutor = vaultTool.executor!;
    vaultTool.executor = async (args: Record<string, unknown>) => {
      const text = await vaultExecutor(args);
      const str = typeof text === "string" ? text : JSON.stringify(text);
      const idMatches = str.matchAll(/\(id:\s*([^,]+),/g);
      for (const m of idMatches) retrievedVaultIds.add(m[1].trim());
      return text;
    };

    const remap = (sdkTool: typeof vaultTool) => {
      const { arguments: schema, ...fnRest } = sdkTool.function as {
        arguments: unknown;
        [k: string]: unknown;
      };
      return {
        type: "function" as const,
        function: { ...fnRest, parameters: schema },
      };
    };
    const tools = [remap(vaultTool), remap(engineTool)];

    const systemPrompt = `Today is ${entry.question_date}.
You are a personal assistant with access to the user's past conversation history. You have two memory tools available — pick the one most appropriate for the question. Answer using information from past conversations. Be concise and direct.`;

    const baseMessages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: entry.question },
    ];

    const transcript: Record<string, unknown> = {
      questionId: entry.question_id,
      question: entry.question,
      expectedAnswer: entry.answer,
      llmModel: api.llmModel,
      strategy: "memory-ensemble",
      messages: [...baseMessages],
      toolCalls: [] as unknown[],
      toolResults: [] as unknown[],
      finalAnswer: "",
    };

    let generatedAnswer = "";
    try {
      const firstResponse = await callChatCompletion(api, baseMessages, {
        tools,
        toolChoice: "required",
        maxTokens: 500,
      });
      addUsage(firstResponse.usage);
      transcript.firstResponse = firstResponse;

      if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
        const sections: string[] = [];
        for (const toolCall of firstResponse.toolCalls) {
          const name = toolCall.function?.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function?.arguments || "{}");
          } catch {
            args = {};
          }
          let toolResultStr = "";
          if (name === "memory_vault_search") {
            const r = await vaultTool.executor!(args);
            toolResultStr = typeof r === "string" ? r : JSON.stringify(r);
            sections.push(`[memory_vault_search]\n${toolResultStr}`);
          } else if (name === "search_memory") {
            const r = await engineTool.executor!(args);
            toolResultStr = typeof r === "string" ? r : JSON.stringify(r);
            sections.push(`[search_memory]\n${toolResultStr}`);
          } else {
            continue;
          }
          (transcript.toolCalls as unknown[]).push({
            id: toolCall.id,
            name,
            arguments: toolCall.function?.arguments,
          });
          (transcript.toolResults as unknown[]).push({ name, text: toolResultStr });
        }

        const secondSystemPrompt = [
          systemPrompt,
          "",
          "Tool results from the user's memory:",
          "",
          sections.join("\n\n"),
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
      } else {
        generatedAnswer = firstResponse.content || "";
      }
    } catch (error) {
      console.error("memory-ensemble answering failed:", error);
      transcript.error = String(error);
      generatedAnswer = "";
    }

    transcript.finalAnswer = generatedAnswer;

    const retrievedSessionIds = new Set<string>();
    for (const vId of retrievedVaultIds) {
      const sid = vaultToSession.get(vId);
      if (sid) retrievedSessionIds.add(sid);
    }
    for (const cId of retrievedConvIds) {
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
    await saveTranscript(`${entry.question_id}_ensemble`, transcript, verbose);

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
      strategy: "memory-ensemble",
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
