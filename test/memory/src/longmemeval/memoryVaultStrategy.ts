/**
 * Memory Vault Strategy
 *
 * Tests the SDK's Memory Vault system. Extracts structured facts from
 * LongMemEval conversations, stores them as vault entries via createVaultMemoryOp,
 * pre-embeds them via preEmbedVaultMemories, then searches via
 * createMemoryVaultSearchTool.
 */

import type { Database } from "@nozbe/watermelondb";
import {
  createVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../../../../src/lib/db/memoryVault/operations.js";
import { VaultMemory } from "../../../../src/lib/db/memoryVault/models.js";
import {
  createMemoryVaultSearchTool,
  preEmbedVaultMemories,
  type VaultEmbeddingCache,
} from "../../../../src/lib/memoryVault/searchTool.js";
import type { LongMemEvalEntry, LongMemEvalResult, ApiConfig, TokenUsage } from "./types.js";
import {
  setupDatabase,
  selectSessions,
  callChatCompletion,
  evaluateAnswer,
  extractMemoriesFromSession,
  saveTranscript,
  logProgress,
  clearProgress,
} from "./suite.js";

function createVaultContext(db: Database): VaultMemoryOperationsContext {
  return {
    database: db,
    vaultMemoryCollection: db.collections.get<VaultMemory>("memory_vault"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as VaultMemoryOperationsContext;
}

/**
 * Process a single LongMemEval entry using the Memory Vault strategy.
 *
 * Flow:
 * 1. Extract structured facts from haystack sessions using LLM
 * 2. Store each fact as a vault entry via createVaultMemoryOp
 * 3. Pre-embed vault entries via preEmbedVaultMemories
 * 4. Search via createMemoryVaultSearchTool's executor
 * 5. Two-step LLM flow: question -> tool call -> answer
 */
export async function processEntryMemoryVault(
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

  logProgress("Setting up database...");
  const database = await setupDatabase();
  const vaultCtx = createVaultContext(database);

  // Map vaultEntryId -> sessionId for retrieval metrics
  const vaultToSession = new Map<string, string>();

  try {
    // Step 1: Extract memories from sessions
    const allMemories: Array<{
      sessionId: string;
      content: string;
    }> = [];

    for (let i = 0; i < sessionIndices.length; i++) {
      const sessionIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sessionIdx];
      const sessionId = entry.haystack_session_ids[sessionIdx];

      logProgress(`Extracting memories: ${i + 1}/${totalSessions} sessions`);

      const extracted = await extractMemoriesFromSession(session, sessionIdx, sessionId, api);

      for (const mem of extracted) {
        allMemories.push({
          sessionId: mem.sessionId,
          content: `${mem.key}: ${mem.value}. ${mem.rawEvidence}`,
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
      // No memories extracted — try to answer without context
      logProgress("Generating answer (no memories)...");
      const genAnswer = await callChatCompletion(
        api,
        [
          { role: "system", content: "Answer the question directly. If you don't know, say so." },
          { role: "user", content: entry.question },
        ],
        { maxTokens: 500 }
      );
      clearProgress();

      const generatedAnswer = genAnswer.content || "";
      const earlyUsage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        embeddingTokens: 0,
      };
      if (genAnswer.usage) {
        earlyUsage.promptTokens += genAnswer.usage.prompt_tokens;
        earlyUsage.completionTokens += genAnswer.usage.completion_tokens;
        earlyUsage.totalTokens += genAnswer.usage.total_tokens;
      }

      logProgress("Evaluating answer...");
      const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
      clearProgress();
      if (evalResult.usage) {
        earlyUsage.promptTokens += evalResult.usage.prompt_tokens;
        earlyUsage.completionTokens += evalResult.usage.completion_tokens;
        earlyUsage.totalTokens += evalResult.usage.total_tokens;
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
        tokenUsage: earlyUsage,
        strategy: "memory-vault",
      };
    }

    // Step 2: Store each fact as a vault entry
    logProgress(`Storing ${allMemories.length} vault entries...`);
    const answerSessionIdSet = new Set(entry.answer_session_ids);

    for (const mem of allMemories) {
      const created = await createVaultMemoryOp(vaultCtx, {
        content: mem.content,
      });

      // Track vault entry -> session mapping
      // Prefer answer session attribution when duplicate content exists
      const existingSession = vaultToSession.get(created.uniqueId);
      if (!existingSession || answerSessionIdSet.has(mem.sessionId)) {
        vaultToSession.set(created.uniqueId, mem.sessionId);
      }
    }
    clearProgress();

    // Step 3: Pre-embed vault entries using SDK function
    logProgress("Embedding vault entries...");
    const embeddingCache: VaultEmbeddingCache = new Map();
    const embeddingOptions = {
      apiKey: api.apiKey,
      baseUrl: api.baseUrl,
    };
    await preEmbedVaultMemories(vaultCtx, embeddingOptions, embeddingCache);
    clearProgress();

    if (verbose) {
      console.log(`  Embedded ${embeddingCache.size} vault entries`);
    }

    // Step 4: Create search tool via SDK
    const searchTool = createMemoryVaultSearchTool(vaultCtx, embeddingOptions, embeddingCache, {
      limit: 10,
      minSimilarity: 0.1,
    });

    // Step 5: Two-step LLM flow
    const systemPrompt = `Today is ${entry.question_date}.
You are a personal assistant with access to the user's past conversation history. Answer their question using information from their past conversations. Be concise and direct.`;

    // The SDK's ToolConfig uses "arguments" for the schema, but the OpenAI
    // Chat Completions API expects "parameters". Remap for the API call.
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

    try {
      // Force tool use — in a real conversation the LLM would naturally call
      // the tool, but this eval sends a bare question with no prior context.
      logProgress("Calling LLM (step 1)...");
      const firstResponse = await callChatCompletion(api, baseMessages, {
        tools: [toolDef],
        toolChoice: "required",
        maxTokens: 500,
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

          // Execute the SDK tool's executor
          logProgress("Executing memory_vault_search tool...");
          const toolResult = await searchTool.executor!(args);
          clearProgress();
          const toolResultStr =
            typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);

          // Parse vault entry IDs from tool output for retrieval metrics
          // Format: (id: <id>, similarity: <score>)
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

          // Include search results in the system message so the LLM treats
          // them as authoritative context. This avoids role: "tool" messages
          // which not all providers support (e.g. Gemini via OpenAI compat).
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
            { maxTokens: 500 }
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
    }

    transcript.finalAnswer = generatedAnswer;

    // Compute retrieval metrics
    const retrievedSessionIds = new Set<string>();
    for (const vaultId of retrievedVaultIds) {
      const sessionId = vaultToSession.get(vaultId);
      if (sessionId) retrievedSessionIds.add(sessionId);
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

    // Evaluate answer
    logProgress("Evaluating answer...");
    const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
    clearProgress();
    addUsage(evalResult.usage);
    const isCorrect = evalResult.isCorrect;

    transcript.isCorrect = isCorrect;
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
    // Release in-memory LokiJS database to prevent OOM across 289 iterations
    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
    } catch {
      // Best-effort cleanup
    }
  }
}
