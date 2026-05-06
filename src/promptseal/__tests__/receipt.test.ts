import { describe, expect, it } from "vitest";

import { generateKeypair, sign } from "../crypto";
import { buildSignedReceipt, CANONICAL_FIELDS, receiptBodyBytes, verifyReceipt } from "../receipt";

describe("receipt", () => {
  it("builds a receipt that verifies", async () => {
    const { sk } = generateKeypair();
    const r = await buildSignedReceipt({
      sk,
      agentId: "test-agent",
      agentErc8004TokenId: 1,
      eventType: "llm_start",
      payloadExcerpt: { model: "claude" },
      parentHash: null,
    });
    expect(r.event_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(r.signature).toMatch(/^ed25519:/);
    expect(await verifyReceipt(r)).toBe(true);
  });

  it("returns false when payload tampered", async () => {
    const { sk } = generateKeypair();
    const r = await buildSignedReceipt({
      sk,
      agentId: "test-agent",
      agentErc8004TokenId: null,
      eventType: "tool_end",
      payloadExcerpt: { tool_name: "decide" },
      parentHash: "sha256:" + "ab".repeat(32),
    });
    const tampered = { ...r, payload_excerpt: { tool_name: "evil" } };
    expect(await verifyReceipt(tampered)).toBe(false);
  });

  it("ignores extra non-canonical fields on read-back (whitelist invariant)", async () => {
    const { sk } = generateKeypair();
    const r = await buildSignedReceipt({
      sk,
      agentId: "test-agent",
      agentErc8004TokenId: 633,
      eventType: "tool_start",
      payloadExcerpt: { tool_name: "resume_parse", args_hash: "sha256:aa" },
      parentHash: null,
    });
    // Simulate Dexie returning the row with an auto-incremented id and a
    // few storage-internal fields. The whitelist canonicalization must
    // ignore these; verification must still succeed.
    const withDexieFields = {
      ...r,
      id: 42,
      __dexie_internal: "foo",
      runId: "run-abc",
    };
    expect(await verifyReceipt(withDexieFields)).toBe(true);
  });

  it("CANONICAL_FIELDS contains the expected nine fields", () => {
    expect(CANONICAL_FIELDS).toEqual([
      "agent_erc8004_token_id",
      "agent_id",
      "event_type",
      "paired_event_hash",
      "parent_hash",
      "payload_excerpt",
      "public_key",
      "schema_version",
      "timestamp",
    ]);
  });

  it("receiptBodyBytes does not include event_hash or signature", async () => {
    const { sk } = generateKeypair();
    const r = await buildSignedReceipt({
      sk,
      agentId: "x",
      agentErc8004TokenId: null,
      eventType: "llm_end",
      payloadExcerpt: { output_hash: "sha256:00" },
      parentHash: null,
    });
    const bytes = receiptBodyBytes(r);
    const text = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual([
      "agent_erc8004_token_id",
      "agent_id",
      "event_type",
      "paired_event_hash",
      "parent_hash",
      "payload_excerpt",
      "public_key",
      "schema_version",
      "timestamp",
    ]);
  });
});
