/**
 * PromptSeal hooks adapter — turns the SDK's universal receipt-shaped
 * `runToolLoop` callbacks into a stream of signed receipts in a
 * `ReceiptChain`. Mirrors Python `promptseal/handler.py`.
 *
 * Pairing logic:
 *   - LLM key:  `${runId}:llm:${stepIndex}`  (one start ↔ one end per round)
 *   - Tool key: `${runId}:tool:${toolCallId}`
 *
 * Special: when `onToolEnd` fires for tool name "decide" with a valid
 * hire/reject result, an extra `final_decision` receipt is emitted after
 * the regular `tool_end` — same as Python.
 */
import type {
  LlmEndEvent,
  LlmStartEvent,
  ReceiptHooks,
  ToolEndEvent,
  ToolStartEvent,
} from "../lib/chat/receiptHooks";

import { bytesToHex, canonicalJson, HASH_PREFIX, toBufferSource } from "./canonical";
import type { ReceiptChain } from "./chain";
import { buildSignedReceipt } from "./receipt";

export type CreatePromptSealHooksOptions = {
  chain: ReceiptChain;
  /** Raw 32-byte Ed25519 secret key. */
  agentSecretKey: Uint8Array;
  agentId: string;
  agentTokenId?: number | null;
  /** Override timestamp source — used by tests for byte-equal fixtures. */
  now?: () => string;
  /**
   * Called when the hook adapter encounters a hard error it can't recover
   * from (e.g. signing failed). The SDK will still continue the run; this
   * just surfaces the failure to the caller.
   */
  onHookError?: (err: Error) => void;
};

async function hashUtf8(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", toBufferSource(bytes));
  return HASH_PREFIX + bytesToHex(new Uint8Array(digest));
}

async function hashCanonical(value: unknown): Promise<string> {
  const bytes = canonicalJson(jsonSafe(value));
  const digest = await crypto.subtle.digest("SHA-256", toBufferSource(bytes));
  return HASH_PREFIX + bytesToHex(new Uint8Array(digest));
}

/** Best-effort coercion to JSON-hashable form. */
function jsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      out[k] = jsonSafe((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return String(value);
}

function extractDecision(
  result: unknown
): { candidate_id: unknown; decision: "hire" | "reject"; reasoning_hash: string } | null {
  let parsed: unknown = result;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const decision = obj.decision;
  if (decision !== "hire" && decision !== "reject") return null;
  const reasoning = String(obj.reasoning ?? "");
  // reasoning_hash is async; the caller will await separately.
  return {
    candidate_id: obj.candidate_id,
    decision,
    reasoning_hash: reasoning,
  };
}

/**
 * Build the four receipt-shaped hooks. The returned bundle is plug-and-play
 * with `runToolLoop({ ...options, onLlmStart, onLlmEnd, onToolStart, onToolEnd })`.
 */
export function createPromptSealHooks(opts: CreatePromptSealHooksOptions): Required<ReceiptHooks> {
  const { chain, agentSecretKey, agentId } = opts;
  const tokenId = opts.agentTokenId ?? null;
  const now = opts.now;
  const onError =
    opts.onHookError ??
    ((err: Error) => {
      // Surface a console warning by default so silent breakage is visible.
      // Callers can supply a custom handler to integrate with their logger.
      // eslint-disable-next-line no-console -- intentional fallback
      console.warn("[promptseal] hook error:", err);
    });

  // Pending start hashes keyed by per-event identity.
  const pendingStarts = new Map<string, string>();
  // Track open runs so we openRun(...) on first emit per runId.
  const openedRuns = new Set<string>();

  async function ensureRunOpen(runId: string): Promise<void> {
    if (openedRuns.has(runId)) return;
    openedRuns.add(runId);
    await chain.openRun(runId, agentId);
  }

  async function emit(
    runId: string,
    eventType:
      | "llm_start"
      | "llm_end"
      | "tool_start"
      | "tool_end"
      | "final_decision"
      | "error",
    payload: Record<string, unknown>,
    pairedEventHash: string | null = null
  ): Promise<string> {
    await ensureRunOpen(runId);
    const parentHash = await chain.latestEventHash(runId);
    const receipt = await buildSignedReceipt({
      sk: agentSecretKey,
      agentId,
      agentErc8004TokenId: tokenId,
      eventType,
      payloadExcerpt: payload,
      parentHash,
      pairedEventHash,
      timestamp: now ? now() : undefined,
    });
    await chain.append(runId, receipt);
    return receipt.event_hash;
  }

  return {
    async onLlmStart(e: LlmStartEvent) {
      try {
        const systemMessages = e.messages.filter(
          (m): m is { role: string; content: unknown } =>
            !!m && typeof m === "object" && (m as { role?: unknown }).role === "system"
        );
        const nonSystem = e.messages.filter(
          (m) => !m || typeof m !== "object" || (m as { role?: unknown }).role !== "system"
        );
        const systemText = systemMessages
          .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
          .join("");
        const payload = {
          model: e.model,
          temperature:
            (e.requestBody as Record<string, unknown> | undefined)?.temperature ?? null,
          system_prompt_hash: systemText ? await hashUtf8(systemText) : null,
          messages_hash: await hashCanonical(nonSystem),
        };
        const eh = await emit(e.runId, "llm_start", payload);
        pendingStarts.set(`${e.runId}:llm:${e.stepIndex}`, eh);
      } catch (err) {
        onError(err as Error);
      }
    },

    async onLlmEnd(e: LlmEndEvent) {
      try {
        const key = `${e.runId}:llm:${e.stepIndex}`;
        const paired = pendingStarts.get(key) ?? null;
        pendingStarts.delete(key);
        if (e.error) {
          await emit(
            e.runId,
            "error",
            {
              stage: "llm",
              error_type: "stream_error",
              message_hash: await hashUtf8(e.error),
            },
            paired
          );
          return;
        }
        const payload = {
          output_hash: await hashUtf8(e.content ?? ""),
          token_usage: e.usage
            ? {
                input_tokens: e.usage.inputTokens ?? null,
                output_tokens: e.usage.outputTokens ?? null,
              }
            : null,
          finish_reason: e.finishReason ?? null,
          tool_calls: e.toolCalls.map((tc) => ({ id: tc.id, name: tc.name })),
        };
        await emit(e.runId, "llm_end", payload, paired);
      } catch (err) {
        onError(err as Error);
      }
    },

    async onToolStart(e: ToolStartEvent) {
      try {
        const argsHash = await hashCanonical(e.parsedArguments ?? e.rawArguments);
        const eh = await emit(e.runId, "tool_start", {
          tool_name: e.name,
          tool_call_id: e.toolCallId,
          args_hash: argsHash,
        });
        pendingStarts.set(`${e.runId}:tool:${e.toolCallId}`, eh);
      } catch (err) {
        onError(err as Error);
      }
    },

    async onToolEnd(e: ToolEndEvent) {
      try {
        const key = `${e.runId}:tool:${e.toolCallId}`;
        const paired = pendingStarts.get(key) ?? null;
        pendingStarts.delete(key);
        if (e.error) {
          await emit(
            e.runId,
            "error",
            {
              stage: "tool",
              tool_name: e.name,
              error_type: e.errorType ?? "execution",
              message_hash: await hashUtf8(e.error),
            },
            paired
          );
          return;
        }
        const outputStr =
          typeof e.result === "string" ? e.result : JSON.stringify(jsonSafe(e.result));
        await emit(
          e.runId,
          "tool_end",
          {
            tool_name: e.name,
            tool_call_id: e.toolCallId,
            output_hash: await hashUtf8(outputStr),
          },
          paired
        );
        if (e.name === "decide") {
          const decision = extractDecision(e.result);
          if (decision) {
            await emit(e.runId, "final_decision", {
              candidate_id: decision.candidate_id ?? null,
              decision: decision.decision,
              reasoning_hash: await hashUtf8(decision.reasoning_hash),
            });
          }
        }
      } catch (err) {
        onError(err as Error);
      }
    },
  };
}
