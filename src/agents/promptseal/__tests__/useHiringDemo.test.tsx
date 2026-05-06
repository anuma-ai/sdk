/**
 * Integration test for `useHiringDemo`.
 *
 * Stubs the SSE transport with canned tool-use chunks for the full
 * resume_parse → score_candidate → decide flow, asserts the chain ends
 * with `verifyChain` green, the final decision is captured, and tampering
 * a row flips the chain integrity to red.
 */
import "fake-indexeddb/auto";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { StreamingTransport } from "../../../lib/chat/toolLoop";
import { generateKeypair, publicKeyBytes } from "../../../promptseal/crypto";
import { useHiringDemo } from "../useHiringDemo";

function bytesToBase64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!);
  return btoa(s);
}

/**
 * Build a four-round canned transport: resume_parse → score_candidate →
 * decide → final text. Each round emits one tool call (or plain text)
 * shaped for the Responses API.
 */
function buildCannedTransport(): StreamingTransport {
  const rounds = [
    // Round 0: resume_parse
    [
      { type: "response.created", response: { id: "r0", model: "test" } },
      {
        type: "response.output_item.added",
        item: { id: "fc-0", type: "function_call", name: "resume_parse", call_id: "call-0", arguments: "" },
      },
      {
        type: "response.function_call_arguments.done",
        item_id: "fc-0",
        call_id: "call-0",
        arguments: JSON.stringify({ resume_id: "res_001" }),
      },
      { type: "response.completed", response: { usage: { input_tokens: 5, output_tokens: 3 } } },
    ],
    // Round 1: score_candidate
    [
      { type: "response.created", response: { id: "r1", model: "test" } },
      {
        type: "response.output_item.added",
        item: { id: "fc-1", type: "function_call", name: "score_candidate", call_id: "call-1", arguments: "" },
      },
      {
        type: "response.function_call_arguments.done",
        item_id: "fc-1",
        call_id: "call-1",
        arguments: JSON.stringify({
          name: "Alice Chen",
          yoe_react: 7,
          yoe_python: 5,
          education: "BS Computer Science, Stanford",
          highlights: "Led frontend team at unicorn fintech; OSS contributor (15k stars)",
        }),
      },
      { type: "response.completed", response: { usage: { input_tokens: 10, output_tokens: 5 } } },
    ],
    // Round 2: decide
    [
      { type: "response.created", response: { id: "r2", model: "test" } },
      {
        type: "response.output_item.added",
        item: { id: "fc-2", type: "function_call", name: "decide", call_id: "call-2", arguments: "" },
      },
      {
        type: "response.function_call_arguments.done",
        item_id: "fc-2",
        call_id: "call-2",
        arguments: JSON.stringify({
          technical_score: 9,
          culture_score: 8,
          ambiguity_score: 3,
          candidate_id: "res_001",
        }),
      },
      { type: "response.completed", response: { usage: { input_tokens: 12, output_tokens: 4 } } },
    ],
    // Round 3: final text
    [
      { type: "response.created", response: { id: "r3", model: "test" } },
      { type: "response.output_text.delta", delta: { OfString: "Hire Alice." } },
      { type: "response.completed", response: { usage: { input_tokens: 15, output_tokens: 4 } } },
    ],
  ];
  let idx = 0;
  return () => {
    const chunks = rounds[idx++] ?? [];
    return {
      stream: (async function* () {
        for (const c of chunks) yield c;
      })(),
    };
  };
}

describe("useHiringDemo (integration)", () => {
  let agentSecretKey: string;

  beforeEach(async () => {
    const { sk } = generateKeypair();
    agentSecretKey = bytesToBase64(sk);
    // Touch publicKeyBytes so we know the key shape is right.
    expect((await publicKeyBytes(sk)).length).toBe(32);
  });

  afterEach(() => {
    /* fake-indexeddb auto-cleans by db name; tests use unique names below. */
  });

  it("runs the full hiring flow and produces a verifiable chain", async () => {
    const transport = buildCannedTransport();
    const dbName = `hiring-demo-test-${Math.random().toString(36).slice(2)}`;
    const { result } = renderHook(() =>
      useHiringDemo({
        walletPrivateKey: ("0x" + "11".repeat(32)) as `0x${string}`,
        agentSecretKey,
        llmToken: "stub-token",
        agentTokenId: 633,
        dbName,
        transport,
      })
    );

    await act(async () => {
      await result.current.run("res_001");
    });

    await waitFor(() => {
      expect(result.current.state).toBe("run-complete");
    });

    expect(result.current.chainOk).toBe(true);
    expect(result.current.receipts.length).toBeGreaterThanOrEqual(8);
    // We expect: 4 LLM rounds (start+end each = 8) + 3 tool calls (start+end each = 6)
    // + 1 final_decision (after decide). That's 15 receipts.
    const types = result.current.receipts.map((r) => r.event_type);
    expect(types).toContain("llm_start");
    expect(types).toContain("llm_end");
    expect(types).toContain("tool_start");
    expect(types).toContain("tool_end");
    expect(types).toContain("final_decision");
    expect(result.current.finalDecision?.candidate_id).toBe("res_001");
    expect(result.current.finalDecision?.decision).toBe("hire");
  }, 30000);

  it("tamper flips chainOk to false; restore returns it to true", async () => {
    const transport = buildCannedTransport();
    const dbName = `hiring-demo-tamper-${Math.random().toString(36).slice(2)}`;
    const { result } = renderHook(() =>
      useHiringDemo({
        walletPrivateKey: ("0x" + "11".repeat(32)) as `0x${string}`,
        agentSecretKey,
        llmToken: "stub-token",
        dbName,
        transport,
      })
    );

    await act(async () => {
      await result.current.run("res_001");
    });

    await waitFor(() => {
      expect(result.current.state).toBe("run-complete");
    });

    expect(result.current.chainOk).toBe(true);

    // Find the final_decision row and tamper its payload via storage id.
    const records = await result.current.chain.listReceiptRecords(result.current.runId!);
    const finalRow = records.find((r) => r.receipt.event_type === "final_decision");
    expect(finalRow).toBeDefined();

    await act(async () => {
      await result.current.tamper(finalRow!.storageId);
    });
    expect(result.current.chainOk).toBe(false);

    await act(async () => {
      await result.current.restore(finalRow!.storageId);
    });
    expect(result.current.chainOk).toBe(true);
  }, 30000);
});
