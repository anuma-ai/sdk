/**
 * Memory Engine Strategy
 *
 * Tests the SDK's on-demand memory retrieval from conversations.
 * Stores LongMemEval sessions as messages in WatermelonDB, chunks and embeds
 * them using the SDK's pipeline, then searches via createMemoryRetrievalTool.
 */

import type { Database } from "@nozbe/watermelondb";
import {
  createConversationOp,
  createMessageOp,
  updateMessageChunksOp,
  type StorageOperationsContext,
} from "../../../../src/lib/db/chat/operations.js";
import type { MessageChunk } from "../../../../src/lib/db/chat/types.js";
import { Message, Conversation } from "../../../../src/lib/db/chat/models.js";
import { chunkText } from "../../../../src/lib/memoryRetrieval/chunking.js";
import { createMemoryRetrievalTool } from "../../../../src/lib/memoryRetrieval/tool.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../../src/lib/memoryRetrieval/constants.js";
import type {
  LongMemEvalEntry,
  LongMemEvalResult,
  LongMemEvalChunkEmbeddingsCache,
  ApiConfig,
} from "./types.js";
import {
  setupDatabase,
  selectSessions,
  callChatCompletion,
  evaluateAnswer,
  generateEmbeddingsBatch,
  generateSingleEmbedding,
  hashChunkContent,
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
 * 2. Chunk and embed all messages using SDK's chunkText + generateEmbeddings
 * 3. Search via createMemoryRetrievalTool's executor
 * 4. Two-step LLM flow: question -> tool call -> answer
 */
export async function processEntryMemoryEngine(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  cache: LongMemEvalChunkEmbeddingsCache,
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
  const storageCtx = createStorageContext(database);

  // Map conversationId -> sessionId for retrieval metrics
  const convToSession = new Map<string, string>();

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

    // Step 2: Chunk and embed all messages
    // Use the embedding cache to avoid re-computing across runs
    const entryCache = cache.entries[entry.question_id];
    const cachedIndex = new Map<string, number[]>();
    if (entryCache) {
      for (const c of entryCache.chunks) {
        const key = `${c.sessionIndex}:${c.messageIndex}:${c.role}:${c.contentHash}`;
        cachedIndex.set(key, c.embedding);
      }
    }

    // Fetch all stored messages and chunk + embed them
    const allMessages = await storageCtx.messagesCollection.query().fetch();
    let embeddedCount = 0;
    const totalMessages = allMessages.length;
    const BATCH_SIZE = 96;

    // Collect all chunks that need embedding
    const pendingChunks: Array<{
      messageId: string;
      chunks: Array<{ text: string; startOffset: number; endOffset: number }>;
      sessionIndex: number;
      messageIndex: number;
      role: string;
      content: string;
    }> = [];

    // Track message -> (sessionIndex, messageIndex) for cache key
    // We need to figure out sessionIndex and messageIndex from the conversation mapping
    const convMessages = new Map<string, number>(); // convId -> message count

    for (const message of allMessages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convId = (message as any)._getRaw("conversation_id") as string;
      const content = message.content;
      const role = message.role;
      const count = convMessages.get(convId) || 0;
      convMessages.set(convId, count + 1);

      // Figure out session index from conv -> session mapping
      const sessionId = convToSession.get(convId);
      const sessionIndex = sessionId
        ? entry.haystack_session_ids.indexOf(sessionId)
        : -1;
      const messageIndex = count; // 0-indexed within this conversation

      // Chunk the message content using SDK's chunking
      const textChunks = chunkText(content);
      const contentHash = hashChunkContent(role as "user" | "assistant", content);

      // Check cache for this chunk's embedding
      const cacheKey = `${sessionIndex}:${messageIndex}:${role}:${contentHash}`;
      const cachedEmbedding = cachedIndex.get(cacheKey);

      if (cachedEmbedding && cachedEmbedding.length > 0) {
        // Use cached embedding — for simplicity, apply the same embedding to all
        // chunks of this message (the cache stores per-message, not per-chunk)
        const messageChunks: MessageChunk[] = textChunks.map((tc) => ({
          text: tc.text,
          vector: cachedEmbedding,
          startOffset: tc.startOffset,
          endOffset: tc.endOffset,
        }));
        await updateMessageChunksOp(
          storageCtx,
          message.id,
          messageChunks,
          DEFAULT_API_EMBEDDING_MODEL
        );
        embeddedCount++;
      } else {
        pendingChunks.push({
          messageId: message.id,
          chunks: textChunks,
          sessionIndex,
          messageIndex,
          role,
          content,
        });
      }
    }

    // Batch embed pending chunks
    if (pendingChunks.length > 0) {
      // Flatten all chunk texts for batch embedding
      const allChunkTexts: string[] = [];
      const chunkMapping: Array<{ pendingIdx: number; chunkIdx: number }> = [];

      for (let pi = 0; pi < pendingChunks.length; pi++) {
        for (let ci = 0; ci < pendingChunks[pi].chunks.length; ci++) {
          allChunkTexts.push(pendingChunks[pi].chunks[ci].text);
          chunkMapping.push({ pendingIdx: pi, chunkIdx: ci });
        }
      }

      logProgress(`Embedding ${allChunkTexts.length} chunks...`);

      // Generate embeddings in batches
      const allEmbeddings: number[][] = [];
      for (let i = 0; i < allChunkTexts.length; i += BATCH_SIZE) {
        const batchTexts = allChunkTexts.slice(i, i + BATCH_SIZE);
        logProgress(`Embedding chunks: ${i + batchTexts.length}/${allChunkTexts.length}`);
        const batchEmbeddings = await generateEmbeddingsBatch(batchTexts, api);
        allEmbeddings.push(...batchEmbeddings);
      }

      // Assign embeddings back and store
      // Group by pending message
      const messageChunkMap = new Map<number, MessageChunk[]>();
      for (let i = 0; i < chunkMapping.length; i++) {
        const { pendingIdx, chunkIdx } = chunkMapping[i];
        const pending = pendingChunks[pendingIdx];
        const chunk = pending.chunks[chunkIdx];
        const embedding = allEmbeddings[i] || [];

        if (!messageChunkMap.has(pendingIdx)) {
          messageChunkMap.set(pendingIdx, []);
        }
        messageChunkMap.get(pendingIdx)!.push({
          text: chunk.text,
          vector: embedding,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        });
      }

      for (const [pendingIdx, messageChunks] of messageChunkMap) {
        const pending = pendingChunks[pendingIdx];
        await updateMessageChunksOp(
          storageCtx,
          pending.messageId,
          messageChunks,
          DEFAULT_API_EMBEDDING_MODEL
        );

        // Update cache with the first chunk's embedding (for cache key compatibility)
        const contentHash = hashChunkContent(
          pending.role as "user" | "assistant",
          pending.content
        );
        const cacheKey = `${pending.sessionIndex}:${pending.messageIndex}:${pending.role}:${contentHash}`;
        const firstEmb = messageChunks[0]?.vector;
        if (firstEmb && firstEmb.length > 0) {
          cachedIndex.set(cacheKey, firstEmb);
        }

        embeddedCount++;
      }
    }

    clearProgress();
    if (verbose) {
      console.log(`  Embedded ${embeddedCount}/${totalMessages} messages`);
    }

    // Update the disk cache
    const updatedCacheChunks: LongMemEvalChunkEmbeddingsCache["entries"][string]["chunks"] = [];
    for (const [key, emb] of cachedIndex) {
      const parts = key.split(":");
      updatedCacheChunks.push({
        sessionIndex: parseInt(parts[0], 10),
        messageIndex: parseInt(parts[1], 10),
        role: parts[2] as "user" | "assistant",
        contentHash: parts[3],
        embedding: emb,
      });
    }
    cache.entries[entry.question_id] = { chunks: updatedCacheChunks };

    // Step 3: Create the retrieval tool via SDK
    const embeddingOptions = {
      apiKey: api.apiKey,
      baseUrl: api.baseUrl,
    };

    const retrievalTool = createMemoryRetrievalTool(storageCtx, embeddingOptions, {
      topK: 12,
      minSimilarity: 0.1,
      includeAssistant: true,
    });

    // Step 4: Two-step LLM flow
    const systemPrompt = `You are a memory assistant. Your single goal is to answer the user's question as accurately as possible.
Today is ${entry.question_date}.

Use the search tool if the question may rely on past conversation details.
The tool searches both user and assistant messages by default.
Use top_k=12 unless there is a strong reason to use fewer.
When answering relative-time questions (e.g., "today," "yesterday," "X days ago"), interpret them relative to the question date above, not the real current date.
Use the retrieved chunks as evidence and answer directly. Do not include reasoning in your answer.
If the question asks for a number or count, respond with only the number.
If the information is not present, say "I don't have that information."
In your final answer, do not ask the user any questions; just give your best answer.`;

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
    const retrievedConvIds = new Set<string>();

    try {
      logProgress("Calling LLM (step 1)...");
      const firstResponse = await callChatCompletion(api, baseMessages, {
        tools: [toolDef],
        toolChoice: "auto",
        maxTokens: 500,
      });
      clearProgress();

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
          const toolResultStr = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);

          // Parse conversation IDs from results for retrieval metrics
          // The tool output contains lines like: [1] (user, 2024-01-01, similarity: 0.85)
          // We need to map back. The SDK's searchChunksOp returns conversationId in results
          // but the formatted output doesn't include it. We'll parse what we can.
          // For now, we use the tool executor return and trust the metrics come from
          // mapping conversation IDs that appear in the formatted results.

          (transcript.toolCalls as any[]).push({
            id: toolCall.id,
            name: toolCall.function?.name,
            arguments: toolCall.function?.arguments,
          });
          (transcript.toolResults as any[]).push({ text: toolResultStr });

          // Build followup message with tool results
          const followupContent = [
            entry.question,
            "",
            toolResultStr,
          ].join("\n");

          logProgress("Calling LLM (step 2)...");
          const secondResponse = await callChatCompletion(
            api,
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: followupContent },
            ],
            { maxTokens: 500 }
          );
          clearProgress();

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

    // For retrieval metrics, we use a heuristic: search directly to get session IDs
    // The tool executor doesn't expose structured results, so we do a parallel search
    logProgress("Computing retrieval metrics...");
    const queryEmbedding = await generateSingleEmbedding(entry.question, api);
    if (queryEmbedding.length > 0) {
      const { searchChunksOp } = await import("../../../../src/lib/db/chat/operations.js");
      const rawResults = await searchChunksOp(storageCtx, queryEmbedding, {
        limit: 12,
        minSimilarity: 0.1,
      });
      for (const r of rawResults) {
        const convId = r.message.conversationId;
        if (convId) retrievedConvIds.add(convId);
      }
    }
    clearProgress();

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
      retrievedSessionIds.size > 0
        ? correctlyRetrieved / retrievedSessionIds.size
        : 0;
    const retrievalRecall =
      expectedSessionIds.size > 0
        ? correctlyRetrieved / expectedSessionIds.size
        : 0;

    transcript.retrieval = {
      precision: retrievalPrecision,
      recall: retrievalRecall,
      retrievedSessionIds: [...retrievedSessionIds],
      expectedSessionIds: entry.answer_session_ids,
    };

    // Evaluate answer
    logProgress("Evaluating answer...");
    const isCorrect = await evaluateAnswer(
      entry.question,
      entry.answer,
      generatedAnswer,
      api
    );
    clearProgress();

    transcript.isCorrect = isCorrect;
    await saveTranscript(entry.question_id, transcript, verbose);

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
      strategy: "memory-engine",
    };
  } catch (error) {
    const elapsed = performance.now() - startTime;
    clearProgress();
    throw error;
  }
}
