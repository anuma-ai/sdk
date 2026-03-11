/**
 * Memory Engine Strategy
 *
 * Tests the SDK's on-demand memory retrieval from conversations.
 * Stores LongMemEval sessions as messages in WatermelonDB, chunks and embeds
 * them using the SDK's chunkAndEmbedAllMessages, then searches via
 * createMemoryEngineTool.
 */

import type { Database } from "@nozbe/watermelondb";
import {
  createConversationOp,
  createMessageOp,
  type StorageOperationsContext,
} from "../../../../src/lib/db/chat/operations.js";
import { Message, Conversation } from "../../../../src/lib/db/chat/models.js";
import { chunkAndEmbedAllMessages } from "../../../../src/lib/memoryEngine/embeddings.js";
import { createMemoryEngineTool } from "../../../../src/lib/memoryEngine/tool.js";
import type { LongMemEvalEntry, LongMemEvalResult, ApiConfig, TokenUsage } from "./types.js";
import {
  setupDatabase,
  selectSessions,
  callChatCompletion,
  evaluateAnswer,
  saveTranscript,
  logProgress,
  clearProgress,
} from "./suite.js";

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

/**
 * Process a single LongMemEval entry using the Memory Engine strategy.
 *
 * Flow:
 * 1. Store each haystack session as a conversation with messages in WatermelonDB
 * 2. Chunk and embed all messages using SDK's chunkAndEmbedAllMessages
 * 3. Search via createMemoryEngineTool's executor
 * 4. Two-step LLM flow: question -> tool call -> answer
 */
export async function processEntryMemoryEngine(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number,
  embeddingCache?: Map<string, number[]>
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
  const storageCtx = createStorageContext(database);

  // Map conversationId -> sessionId for retrieval metrics
  const convToSession = new Map<string, string>();

  // Token tracking — declared early so embedding callbacks can accumulate too
  const tokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    embeddingTokens: 0,
  };

  try {
    // Step 1: Store haystack sessions as conversations + messages
    logProgress("Storing sessions as messages...");
    for (let i = 0; i < sessionIndices.length; i++) {
      const sessionIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sessionIdx];
      const sessionId = entry.haystack_session_ids[sessionIdx];

      logProgress(`Storing sessions: ${i + 1}/${totalSessions}`);

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

    // Step 2: Chunk and embed all messages using SDK's pipeline
    const embeddingOptions = {
      apiKey: api.apiKey,
      baseUrl: api.baseUrl,
      ...(embeddingCache ? { cache: embeddingCache } : {}),
      onUsage: (usage: { promptTokens: number; totalTokens: number }) => {
        tokenUsage.embeddingTokens += usage.totalTokens;
      },
    };

    logProgress("Chunking and embedding messages...");
    const embeddedCount = await chunkAndEmbedAllMessages(storageCtx, embeddingOptions);
    clearProgress();

    if (verbose) {
      console.log(`  Embedded ${embeddedCount} messages`);
    }

    // Step 3: Create the retrieval tool via SDK
    // Capture conversation IDs that the tool actually returns to the LLM
    // so retrieval metrics reflect the real code path, not a separate search.
    const retrievedConvIds = new Set<string>();
    const retrievalTool = createMemoryEngineTool(
      storageCtx,
      embeddingOptions,
      {
        topK: 12,
        minSimilarity: 0.1,
        includeAssistant: true,
      },
      {
        onRetrieve: (convIds) => {
          for (const id of convIds) retrievedConvIds.add(id);
        },
      }
    );

    // Step 4: Two-step LLM flow
    // The SDK relies on tool descriptions to guide usage, so we don't coach
    // the LLM on how to use the tool. We do provide the context that a real
    // conversation assistant would have: the date and the fact that retrieved
    // results are from the user's own past conversations.
    const systemPrompt = `Today is ${entry.question_date}.
You are a personal assistant with access to the user's past conversation history. Answer their question using information from their past conversations. Be concise and direct.`;

    // The SDK's ToolConfig uses "arguments" for the schema, but the OpenAI
    // Chat Completions API expects "parameters". Remap for the API call.
    const { arguments: schema, ...fnRest } = retrievalTool.function as any;
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
      strategy: "memory-engine",
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
          if (toolCall.function?.name !== "search_memory") continue;

          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }

          // Execute the SDK tool's executor
          logProgress("Executing search_memory tool...");
          const toolResult = await retrievalTool.executor!(args);
          clearProgress();
          const toolResultStr =
            typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);

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
            "The following are excerpts from the user's past conversations, retrieved by a memory search. Use them to answer the user's question.",
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
      console.error("Memory engine answering failed:", error);
      generatedAnswer = "";
      transcript.error = String(error);
    }

    transcript.finalAnswer = generatedAnswer;

    // Retrieval metrics are derived from the onRetrieve callback above,
    // which captures the exact conversation IDs the tool returned to the LLM.
    const retrievedSessionIds = new Set<string>();
    for (const convId of retrievedConvIds) {
      const sessionId = convToSession.get(convId);
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
    await saveTranscript(entry.question_id, transcript, verbose);

    const elapsed = performance.now() - startTime;

    if (verbose) {
      console.log(`  Answer: ${generatedAnswer.slice(0, 100)}...`);
      console.log(`  Expected: ${entry.answer}`);
      console.log(`  Correct: ${isCorrect}`);
      console.log(`  Time: ${elapsed.toFixed(0)}ms`);
    }

    // Include embedding tokens in the total
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
      strategy: "memory-engine",
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
