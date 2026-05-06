/**
 * Round-trip safety + integrity tests for the IndexedDB ReceiptChain.
 * Uses `fake-indexeddb` so the tests run under happy-dom without a browser.
 */
import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { ChainIntegrityError, ReceiptChain } from "../chain";
import { generateKeypair } from "../crypto";
import { buildSignedReceipt, type Receipt, verifyReceipt } from "../receipt";

let dbCounter = 0;
function newChain(): ReceiptChain {
  return new ReceiptChain(`promptseal-test-${++dbCounter}`);
}

async function buildChainOfReceipts(
  chain: ReceiptChain,
  runId: string,
  count: number
): Promise<Receipt[]> {
  const { sk } = generateKeypair();
  await chain.openRun(runId, "test-agent");
  const out: Receipt[] = [];
  let parent: string | null = null;
  for (let i = 0; i < count; i++) {
    const r = await buildSignedReceipt({
      sk,
      agentId: "test-agent",
      agentErc8004TokenId: 633,
      eventType: i % 2 === 0 ? "llm_start" : "llm_end",
      payloadExcerpt: { i },
      parentHash: parent,
    });
    await chain.append(runId, r);
    parent = r.event_hash;
    out.push(r);
  }
  return out;
}

describe("ReceiptChain", () => {
  let chains: ReceiptChain[] = [];

  afterEach(async () => {
    for (const c of chains) {
      try {
        await c.clearAll();
        c.close();
      } catch {
        /* ignore */
      }
    }
    chains = [];
  });

  it("appends and retrieves receipts in order", async () => {
    const chain = newChain();
    chains.push(chain);
    const receipts = await buildChainOfReceipts(chain, "run-A", 5);
    const out = await chain.getReceipts("run-A");
    expect(out.map((r) => r.event_hash)).toEqual(receipts.map((r) => r.event_hash));
  });

  it("verifyChain returns [true, null] for an intact chain", async () => {
    const chain = newChain();
    chains.push(chain);
    await buildChainOfReceipts(chain, "run-B", 14);
    const [ok, reason] = await chain.verifyChain("run-B");
    expect(ok).toBe(true);
    expect(reason).toBeNull();
  });

  it("rejects an append whose parent_hash does not match", async () => {
    const chain = newChain();
    chains.push(chain);
    const { sk } = generateKeypair();
    await chain.openRun("run-C", "agent");
    const a = await buildSignedReceipt({
      sk,
      agentId: "agent",
      agentErc8004TokenId: null,
      eventType: "llm_start",
      payloadExcerpt: {},
      parentHash: null,
    });
    await chain.append("run-C", a);
    const bad = await buildSignedReceipt({
      sk,
      agentId: "agent",
      agentErc8004TokenId: null,
      eventType: "llm_end",
      payloadExcerpt: {},
      parentHash: "sha256:" + "00".repeat(32),
    });
    await expect(chain.append("run-C", bad)).rejects.toBeInstanceOf(ChainIntegrityError);
  });

  it("round-trip: append → getReceipts → verifyReceipt is true (whitelist invariant)", async () => {
    const chain = newChain();
    chains.push(chain);
    const receipts = await buildChainOfReceipts(chain, "run-D", 14);
    const out = await chain.getReceipts("run-D");
    expect(out).toHaveLength(receipts.length);
    for (const r of out) {
      expect(await verifyReceipt(r)).toBe(true);
    }
  });

  it("listReceiptRecords returns storageId paired with the same Receipt", async () => {
    const chain = newChain();
    chains.push(chain);
    await buildChainOfReceipts(chain, "run-E", 3);
    const records = await chain.listReceiptRecords("run-E");
    const receipts = await chain.getReceipts("run-E");
    expect(records).toHaveLength(receipts.length);
    for (let i = 0; i < records.length; i++) {
      expect(records[i]!.receipt).toEqual(receipts[i]);
      expect(typeof records[i]!.storageId).toBe("number");
    }
  });

  it("tamper → verifyChain RED, restore → GREEN", async () => {
    const chain = newChain();
    chains.push(chain);
    await buildChainOfReceipts(chain, "run-F", 5);
    const records = await chain.listReceiptRecords("run-F");
    const target = records[2]!.storageId;

    let [ok] = await chain.verifyChain("run-F");
    expect(ok).toBe(true);

    await chain.tamper(target);
    [ok] = await chain.verifyChain("run-F");
    expect(ok).toBe(false);

    await chain.restore(target);
    [ok] = await chain.verifyChain("run-F");
    expect(ok).toBe(true);
  });

  it("recordAnchor / getAnchor round-trip", async () => {
    const chain = newChain();
    chains.push(chain);
    await chain.openRun("run-G", "agent");
    await chain.recordAnchor(
      "run-G",
      "sha256:" + "ab".repeat(32),
      "0x" + "cd".repeat(32),
      12345,
      84532
    );
    const a = await chain.getAnchor("run-G");
    expect(a?.merkleRoot).toBe("sha256:" + "ab".repeat(32));
    expect(a?.txHash).toBe("0x" + "cd".repeat(32));
    expect(a?.blockNumber).toBe(12345);
    expect(a?.chainId).toBe(84532);
  });
});
