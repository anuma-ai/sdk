/**
 * Memory Vault Strategy
 *
 * Tests the SDK's Memory Vault system by replaying LongMemEval conversations
 * naturally: the LLM sees each session turn-by-turn with memory_vault_save and
 * memory_vault_search tools, deciding what to remember on its own. This mirrors
 * how real client apps use the vault through the SDK.
 *
 * After ingestion, searches via createMemoryVaultSearchTool to answer the
 * benchmark question.
 */

import type { Database } from "@nozbe/watermelondb";
import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../../../../src/lib/db/memoryVault/operations.js";
import { VaultMemory } from "../../../../src/lib/db/memoryVault/models.js";
import {
  createMemoryVaultSearchTool,
  eagerEmbedContent,
  preEmbedVaultMemories,
  searchVaultMemories,
  type VaultEmbeddingCache,
} from "../../../../src/lib/memoryVault/searchTool.js";
import type { LongMemEvalEntry, LongMemEvalResult, ApiConfig, TokenUsage } from "./types.js";
import type { LongMemEvalSession } from "./types.js";
import {
  setupDatabase,
  selectSessions,
  callChatCompletion,
  evaluateAnswer,
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
 * Replay a single conversation session with the LLM, giving it vault tools
 * so it naturally decides what to save. Returns the number of memories saved
 * and token usage from the ingestion calls.
 */
async function replaySessionWithVault(
  session: LongMemEvalSession,
  sessionId: string,
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: { apiKey: string; baseUrl: string },
  embeddingCache: VaultEmbeddingCache,
  vaultToSession: Map<string, string>,
  api: ApiConfig,
): Promise<{ memoriesSaved: number; usage: TokenUsage }> {
  const usage: TokenUsage = {
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
    usage.promptTokens += u.prompt_tokens;
    usage.completionTokens += u.completion_tokens;
    usage.totalTokens += u.total_tokens;
  }

  // Build the conversation as the LLM would see it in a real app.
  // We present the full session and ask the LLM to save any important facts.
  const conversationText = session.map((msg) => `${msg.role}: ${msg.content}`).join("\n");

  const systemPrompt =
    "You are a personal assistant. You just finished a conversation with the user. " +
    "Review it and save any important facts, preferences, or context about the user " +
    "to your memory vault. Before saving, search existing memories to avoid duplicates — " +
    "if a related memory exists, update it instead of creating a new one. " +
    "Only save information that would be useful in future conversations. " +
    "Save each distinct fact as a separate memory entry. " +
    "When you are done saving memories, respond with DONE.";

  // Tool definitions matching the SDK's tool schema, remapped for the OpenAI API
  const saveTool = {
    type: "function" as const,
    function: {
      name: "memory_vault_save",
      description:
        "Save or update a memory in the user's persistent memory vault. " +
        "Use this to remember important facts, preferences, or context about the user. " +
        "When the vault already contains a related memory, provide its ID to update it " +
        "rather than creating a duplicate. Merge new information into existing entries " +
        "to keep the vault compact and non-redundant.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description:
              "The memory text to save. Should be a concise, self-contained fact or preference.",
          },
          id: {
            type: "string",
            description:
              "The ID of an existing memory to update. " +
              "If omitted, a new memory is created. " +
              "Prefer updating existing memories over creating new ones.",
          },
        },
        required: ["content"],
      },
    },
  };

  const searchTool = {
    type: "function" as const,
    function: {
      name: "memory_vault_search",
      description:
        "Search the user's memory vault for stored facts and preferences using semantic similarity. " +
        "Use this before saving a new vault memory to check for duplicates, and whenever the user's " +
        "question might relate to something previously stored (their name, preferences, important facts). " +
        "Returns matching entries with their IDs for reference or updates.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query to match against vault memories.",
          },
          limit: {
            type: "integer",
            description: "Maximum number of results to return. Default: 5.",
          },
        },
        required: ["query"],
      },
    },
  };

  const tools = [saveTool, searchTool];
  let memoriesSaved = 0;

  // Multi-turn loop: let the LLM call tools until it's done
  const messages: Array<{
    role: string;
    content?: string;
    tool_calls?: any;
    tool_call_id?: string;
  }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Here is the conversation:\n\n${conversationText}` },
  ];

  const maxRounds = 15; // Safety limit to prevent infinite loops
  for (let round = 0; round < maxRounds; round++) {
    const response = await callChatCompletion(api, messages, {
      tools,
      maxTokens: 1000,
    });
    addUsage(response.usage);

    // No tool calls — the LLM is done
    if (!response.toolCalls || response.toolCalls.length === 0) {
      break;
    }

    // Add the assistant message with tool calls to the conversation
    messages.push({
      role: "assistant",
      content: response.content || undefined,
      tool_calls: response.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    });

    // Execute each tool call
    for (const toolCall of response.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      let toolResult: string;

      if (toolCall.function.name === "memory_vault_save") {
        const content = args.content as string;
        const id = args.id as string | undefined;

        if (!content || typeof content !== "string") {
          toolResult = "Error: content is required and must be a string.";
        } else if (id) {
          // Update existing memory
          const existing = await getVaultMemoryOp(vaultCtx, id);
          if (!existing) {
            toolResult = `Error: Memory with ID "${id}" not found.`;
          } else {
            const updated = await updateVaultMemoryOp(vaultCtx, id, {
              content,
              embedding: null,
            });
            if (!updated) {
              toolResult = `Error: Failed to update memory "${id}".`;
            } else {
              // Evict stale embedding, compute new one
              if (existing.content) embeddingCache.delete(existing.content);
              eagerEmbedContent(content, embeddingOptions, embeddingCache, vaultCtx, id).catch(
                () => {},
              );
              vaultToSession.set(id, sessionId);
              toolResult = `Memory updated successfully (ID: ${updated.uniqueId}).`;
            }
          }
        } else {
          // Create new memory
          const created = await createVaultMemoryOp(vaultCtx, { content });
          eagerEmbedContent(
            content,
            embeddingOptions,
            embeddingCache,
            vaultCtx,
            created.uniqueId,
          ).catch(() => {});
          vaultToSession.set(created.uniqueId, sessionId);
          memoriesSaved++;
          toolResult = `Memory saved successfully (ID: ${created.uniqueId}).`;
        }
      } else if (toolCall.function.name === "memory_vault_search") {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 5;

        if (!query || typeof query !== "string") {
          toolResult = "Error: A search query is required.";
        } else {
          try {
            const results = await searchVaultMemories(
              query,
              vaultCtx,
              embeddingOptions,
              embeddingCache,
              { limit, minSimilarity: 0.1 },
            );

            if (results.length === 0) {
              toolResult = "No relevant memories found in the vault.";
            } else {
              const formatted = results
                .map(
                  (r, i) =>
                    `[${i + 1}] (id: ${r.uniqueId}, similarity: ${r.similarity.toFixed(2)})\n${r.content}`,
                )
                .join("\n\n");
              toolResult = `Found ${results.length} vault memories:\n\n${formatted}`;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            toolResult = `Error searching vault: ${message}`;
          }
        }
      } else {
        toolResult = `Unknown tool: ${toolCall.function.name}`;
      }

      // Add tool result to conversation
      messages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: toolCall.id,
      });
    }
  }

  return { memoriesSaved, usage };
}

/**
 * Process a single LongMemEval entry using the Memory Vault strategy.
 *
 * Flow:
 * 1. Replay each haystack session with the LLM, letting it naturally decide
 *    what to save using memory_vault_save and memory_vault_search tools
 * 2. Pre-embed any vault entries that weren't eagerly embedded
 * 3. Search via createMemoryVaultSearchTool's executor
 * 4. Two-step LLM flow: question -> tool call -> answer
 */
export async function processEntryMemoryVault(
  entry: LongMemEvalEntry,
  api: ApiConfig,
  verbose: boolean,
  maxSessions?: number,
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

  const embeddingCache: VaultEmbeddingCache = new Map();
  const embeddingOptions = {
    apiKey: api.apiKey,
    baseUrl: api.baseUrl,
  };

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
    // Step 1: Replay sessions, letting the LLM save memories naturally
    let totalMemoriesSaved = 0;

    for (let i = 0; i < sessionIndices.length; i++) {
      const sessionIdx = sessionIndices[i];
      const session = entry.haystack_sessions[sessionIdx];
      const sessionId = entry.haystack_session_ids[sessionIdx];

      logProgress(`Replaying session: ${i + 1}/${totalSessions}`);

      const result = await replaySessionWithVault(
        session,
        sessionId,
        vaultCtx,
        embeddingOptions,
        embeddingCache,
        vaultToSession,
        api,
      );

      tokenUsage.promptTokens += result.usage.promptTokens;
      tokenUsage.completionTokens += result.usage.completionTokens;
      tokenUsage.totalTokens += result.usage.totalTokens;
      totalMemoriesSaved += result.memoriesSaved;

      if (verbose && result.memoriesSaved > 0) {
        clearProgress();
        console.log(`    Session ${sessionIdx}: ${result.memoriesSaved} memories saved`);
      }
    }

    clearProgress();
    if (verbose) {
      console.log(`  Total memories saved: ${totalMemoriesSaved}`);
    }

    if (totalMemoriesSaved === 0) {
      // No memories saved — try to answer without context
      logProgress("Generating answer (no memories)...");
      const genAnswer = await callChatCompletion(
        api,
        [
          { role: "system", content: "Answer the question directly. If you don't know, say so." },
          { role: "user", content: entry.question },
        ],
        { maxTokens: 500 },
      );
      clearProgress();

      const generatedAnswer = genAnswer.content || "";
      addUsage(genAnswer.usage);

      logProgress("Evaluating answer...");
      const evalResult = await evaluateAnswer(entry.question, entry.answer, generatedAnswer, api);
      clearProgress();
      addUsage(evalResult.usage);

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
        tokenUsage,
        strategy: "memory-vault",
      };
    }

    // Step 2: Ensure all vault entries are embedded (catch any that weren't eagerly embedded)
    logProgress("Embedding vault entries...");
    await preEmbedVaultMemories(vaultCtx, embeddingOptions, embeddingCache);
    clearProgress();

    if (verbose) {
      console.log(`  Embedded ${embeddingCache.size} vault entries`);
    }

    // Step 3: Create search tool via SDK
    const searchTool = createMemoryVaultSearchTool(vaultCtx, embeddingOptions, embeddingCache, {
      limit: 5,
      minSimilarity: 0.1,
    });

    // Step 4: Two-step LLM flow
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
            { maxTokens: 500 },
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
      expectedSessionIds.has(id),
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
    transcript.totalMemoriesSaved = totalMemoriesSaved;
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
