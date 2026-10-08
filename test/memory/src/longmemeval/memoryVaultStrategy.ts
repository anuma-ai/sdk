import {
  preEmbedVaultMemories,
  type VaultEmbeddingCache,
} from "../../../../src/lib/memoryVault/searchTool.js";
import { createMemoryVaultSearchTool } from "../../../../src/lib/memoryVault/searchToolExecutor.js";
import { retain } from "../../../../src/lib/memory/retain.js";
import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import type {
  ApiConfig,
  LongMemEvalEntry,
  LongMemEvalResult,
  RetrievalTuningKnobs,
  TokenUsage,
} from "./types.js";
import { answerFailureReason, evaluateAnswer } from "./judge.js";
import {
  ANSWER_MAX_COMPLETION_TOKENS,
  buildRetrievalTuningOptions,
  callChatCompletion,
  clearProgress,
  createConsolidationFallbackTracker,
  createVaultContext,
  extractMemoriesFromSession,
  formatHaystackDateAsObservation,
  logProgress,
  saveTranscript,
  selectSessions,
  setupDatabase,
} from "./suite.js";

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

export async function processEntryMemoryVault(
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
  } & RetrievalTuningKnobs
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

  logProgress("Setting up database...");
  const database = await setupDatabase();
  const vaultCtx = createVaultContext(database);

  const vaultToSession = new Map<string, string>();

  try {
    const allMemories: Array<{
      sessionId: string;
      content: string;
    }> = [];

    for (let i = 0; i < sessionIndices.length; i++) {
      const sessionIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sessionIdx];
      const sessionId = entry.haystack_session_ids[sessionIdx];

      logProgress(`Extracting memories: ${i + 1}/${totalSessions} sessions`);

      const sessionDate = formatHaystackDateAsObservation(entry.haystack_dates[sessionIdx]);
      const extracted = await extractMemoriesFromSession(
        session,
        sessionIdx,
        sessionId,
        api,
        sessionDate
      );

      for (const mem of extracted) {
        const dateSuffix = mem.kind === "event" && mem.occurredAt ? ` [${mem.occurredAt}]` : "";
        allMemories.push({
          sessionId: mem.sessionId,
          content: `${mem.content}${dateSuffix}`,
        });
      }

      if (verbose && extracted.length > 0) {
        clearProgress();
        console.log(`    Session ${sessionIdx}: ${extracted.length} memories`);
      }
    }

    clearProgress();
    if (verbose) {
      console.log(`  Total memories extracted: ${allMemories.length}`);
    }

    if (allMemories.length === 0) {
      logProgress("Generating answer (no memories)...");
      const earlyUsage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        embeddingTokens: 0,
      };
      let generatedAnswer = "";
      let thrownWhileAnswering: unknown;
      try {
        const genAnswer = await callChatCompletion(
          api,
          [
            { role: "system", content: "Answer the question directly. If you don't know, say so." },
            { role: "user", content: entry.question },
          ],
          { maxTokens: ANSWER_MAX_COMPLETION_TOKENS }
        );
        generatedAnswer = genAnswer.content || "";
        if (genAnswer.usage) {
          earlyUsage.promptTokens += genAnswer.usage.prompt_tokens;
          earlyUsage.completionTokens += genAnswer.usage.completion_tokens;
          earlyUsage.totalTokens += genAnswer.usage.total_tokens;
        }
      } catch (error) {
        console.error("memory-vault no-memory answering failed:", error);
        thrownWhileAnswering = error;
      }
      clearProgress();

      const answerError = answerFailureReason(generatedAnswer, thrownWhileAnswering);
      let isCorrect = false;
      let judgeError: string | undefined;
      if (!answerError) {
        logProgress("Evaluating answer...");
        const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
        clearProgress();
        if (evalResult.usage) {
          earlyUsage.promptTokens += evalResult.usage.prompt_tokens;
          earlyUsage.completionTokens += evalResult.usage.completion_tokens;
          earlyUsage.totalTokens += evalResult.usage.total_tokens;
        }
        isCorrect = evalResult.verdict === "correct";
        judgeError = evalResult.verdict === "unjudgeable" ? evalResult.reason : undefined;
      }

      const elapsed = performance.now() - startTime;
      return {
        questionId: entry.question_id,
        questionType: entry.question_type,
        question: entry.question,
        expectedAnswer: entry.answer,
        generatedAnswer,
        isCorrect,
        ...(judgeError && { judgeError }),
        ...(answerError && { answerError }),
        retrievedSessionIds: [],
        expectedSessionIds: entry.answer_session_ids,
        retrievalPrecision: 0,
        retrievalRecall: 0,
        latencyMs: elapsed,
        tokenUsage: earlyUsage,
        strategy: "memory-vault",
      };
    }

    logProgress(`Storing ${allMemories.length} vault entries...`);
    const answerSessionIdSet = new Set(entry.answer_session_ids);
    const embeddingCache: VaultEmbeddingCache = new Map();
    const embeddingOptions = { apiKey: api.apiKey, baseUrl: api.baseUrl };
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
    clearProgress();
    fallbackTracker.report(entry.question_id);

    logProgress("Embedding vault entries...");
    await preEmbedVaultMemories(vaultCtx, embeddingOptions, embeddingCache);
    clearProgress();

    if (verbose) {
      console.log(`  Embedded ${embeddingCache.size} vault entries`);
    }

    logProgress("Indexing session chunks...");
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
      ? await generateEmbeddings(chunkTexts, {
          ...embeddingOptions,
          cache: embeddingCache,
        })
      : [];
    clearProgress();
    if (verbose) {
      console.log(`  Indexed ${chunkEmbeddings.length} session chunks`);
    }

    const rerankEnabled = searchPipeline?.rerank ?? true;
    const decomposeMode = searchPipeline?.decompose ?? "llm";
    const searchTool = createMemoryVaultSearchTool(vaultCtx, embeddingOptions, embeddingCache, {
      limit: 14,
      minSimilarity: 0.1,
      rerank: rerankEnabled,
      decompose: decomposeMode,
      ...buildRetrievalTuningOptions(searchPipeline),
      ...(decomposeMode === "llm" && {
        decomposeOptions: {
          apiKey: api.apiKey,
          baseUrl: api.baseUrl,
        },
      }),
    });

    const retrievedChunkSessionIds = new Set<string>();
    const vaultExecutor = searchTool.executor!;
    searchTool.executor = async (args: Record<string, unknown>) => {
      const vaultStr = await vaultExecutor(args);
      const query = typeof args.query === "string" ? args.query : "";
      if (!query || chunkEmbeddings.length === 0) return vaultStr;
      const [queryEmbedding] = await generateEmbeddings([query], {
        ...embeddingOptions,
        cache: embeddingCache,
      });
      const ranked = chunkEmbeddings
        .map((emb, i) => ({
          sessionId: chunkSessionIds[i],
          text: chunkTexts[i],
          sim: cosineSim(queryEmbedding, emb),
        }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 7);
      for (const r of ranked) retrievedChunkSessionIds.add(r.sessionId);
      const excerptMax = searchPipeline?.excerptMaxChars ?? 8000;
      const chunkBlock = ranked
        .map(
          (r, i) =>
            `[excerpt ${i + 1}] (similarity: ${r.sim.toFixed(2)})\n${r.text.slice(0, excerptMax)}`
        )
        .join("\n\n");
      return `${vaultStr}\n\n--- Raw conversation excerpts (${ranked.length}) ---\n\n${chunkBlock}`;
    };

    const systemPrompt = `Today is ${entry.question_date}.
You are a personal assistant with access to the user's past conversation history. Answer their question using information from their past conversations. Be concise and direct.`;

    const { arguments: schema, ...fnRest } = searchTool.function as any;
    const toolDef = {
      type: "function" as const,
      function: { ...fnRest, parameters: schema },
    };

    const baseMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: entry.question },
    ];

    const transcript: Record<string, unknown> = {
      questionId: entry.question_id,
      question: entry.question,
      expectedAnswer: entry.answer,
      llmModel: api.llmModel,
      extractionModel: api.extractionModel ?? api.llmModel,
      strategy: "memory-vault",
      messages: [...baseMessages],
      toolCalls: [] as any[],
      toolResults: [] as any[],
      finalAnswer: "",
      retrieval: {
        precision: 0,
        recall: 0,
        retrievedSessionIds: [] as string[],
        expectedSessionIds: entry.answer_session_ids,
      },
    };

    let generatedAnswer = "";
    const retrievedVaultIds = new Set<string>();
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

    let thrownWhileAnswering: unknown;
    try {
      logProgress("Calling LLM (step 1)...");
      const firstResponse = await callChatCompletion(api, baseMessages, {
        tools: [toolDef],
        toolChoice: "required",
        maxTokens: ANSWER_MAX_COMPLETION_TOKENS,
      });
      clearProgress();
      addUsage(firstResponse.usage);

      transcript.firstResponse = firstResponse;

      if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
        for (const toolCall of firstResponse.toolCalls) {
          if (toolCall.function?.name !== "memory_vault_search") continue;

          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }

          logProgress("Executing memory_vault_search tool...");
          const toolResult = await searchTool.executor!(args);
          clearProgress();
          const toolResultStr =
            typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);

          const idMatches = toolResultStr.matchAll(/\(id:\s*([^,]+),/g);
          for (const match of idMatches) {
            retrievedVaultIds.add(match[1].trim());
          }

          (transcript.toolCalls as any[]).push({
            id: toolCall.id,
            name: toolCall.function?.name,
            arguments: toolCall.function?.arguments,
          });
          (transcript.toolResults as any[]).push({ text: toolResultStr });

          const secondSystemPrompt = [
            systemPrompt,
            "",
            "The following are entries from the user's memory vault, retrieved by a search. Use them to answer the user's question.",
            "",
            toolResultStr,
          ].join("\n");

          logProgress("Calling LLM (step 2)...");
          const secondResponse = await callChatCompletion(
            api,
            [
              { role: "system", content: secondSystemPrompt },
              { role: "user", content: entry.question },
            ],
            { maxTokens: ANSWER_MAX_COMPLETION_TOKENS }
          );
          clearProgress();
          addUsage(secondResponse.usage);

          transcript.secondResponse = secondResponse;
          generatedAnswer = secondResponse.content || "";
        }
      } else {
        generatedAnswer = firstResponse.content || "";
      }
    } catch (error) {
      console.error("Memory vault answering failed:", error);
      generatedAnswer = "";
      transcript.error = String(error);
      thrownWhileAnswering = error;
    }

    transcript.finalAnswer = generatedAnswer;
    const answerError = answerFailureReason(generatedAnswer, thrownWhileAnswering);
    if (answerError) transcript.answerError = answerError;

    const retrievedSessionIds = new Set<string>();
    for (const vaultId of retrievedVaultIds) {
      const sessionId = vaultToSession.get(vaultId);
      if (sessionId) retrievedSessionIds.add(sessionId);
    }
    for (const sid of retrievedChunkSessionIds) {
      retrievedSessionIds.add(sid);
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

    let isCorrect = false;
    let judgeError: string | undefined;
    if (!answerError) {
      logProgress("Evaluating answer...");
      const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
      clearProgress();
      addUsage(evalResult.usage);
      isCorrect = evalResult.verdict === "correct";
      judgeError = evalResult.verdict === "unjudgeable" ? evalResult.reason : undefined;
    }

    transcript.isCorrect = isCorrect;
    if (judgeError) transcript.judgeError = judgeError;
    await saveTranscript(`${entry.question_id}_vault`, transcript, verbose);

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
      ...(judgeError && { judgeError }),
      ...(answerError && { answerError }),
      retrievedSessionIds: [...retrievedSessionIds],
      expectedSessionIds: entry.answer_session_ids,
      retrievalPrecision,
      retrievalRecall,
      latencyMs: elapsed,
      tokenUsage,
      strategy: "memory-vault",
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
      // Best-effort cleanup
    }
  }
}
