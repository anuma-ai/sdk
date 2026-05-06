/**
 * Live anchor smoke test.
 *
 * Generates 5 deterministic receipts (no LLM calls), builds a Merkle root,
 * and anchors the root on Base Sepolia from the demo wallet. Prints the
 * tx hash so it can be linked from BRANCH_NOTES.md.
 *
 * Reads PROMPTSEAL_DEMO_PRIVATE_KEY from the environment. Run as:
 *
 *   set -a; . /Users/tanmay/IdeaProjects/kingpinXD/promptseal/.env.demo; set +a
 *   node scripts/promptseal-smoke-anchor.mjs
 *
 * Or pass the key inline:
 *
 *   PROMPTSEAL_DEMO_PRIVATE_KEY=0x... node scripts/promptseal-smoke-anchor.mjs
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as ed from "@noble/ed25519";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const CHAIN_ID = 84532;
let PRIV =
  process.env.PROMPTSEAL_DEMO_WALLET_SK ||
  process.env.PROMPTSEAL_DEMO_PRIVATE_KEY ||
  process.env.DEPLOYER_PRIVATE_KEY ||
  "";

if (!PRIV) {
  console.error(
    "PROMPTSEAL_DEMO_WALLET_SK (or DEPLOYER_PRIVATE_KEY) env var required."
  );
  process.exit(1);
}
if (!PRIV.startsWith("0x")) PRIV = "0x" + PRIV;

const HEX = "0123456789abcdef";
function hex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >>> 4];
    out += HEX[bytes[i] & 0x0f];
  }
  return out;
}

async function sha256(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(d);
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  throw new Error("unsupported type");
}

const enc = new TextEncoder();

async function buildReceipt(sk, idx, parent) {
  const pk = await ed.getPublicKeyAsync(sk);
  const body = {
    agent_erc8004_token_id: 633,
    agent_id: "smoke-test",
    event_type: idx % 2 === 0 ? "llm_start" : "llm_end",
    paired_event_hash: null,
    parent_hash: parent,
    payload_excerpt: { i: idx },
    public_key: "ed25519:" + Buffer.from(pk).toString("base64"),
    schema_version: "0.1",
    timestamp: new Date().toISOString(),
  };
  const bytes = enc.encode(canonical(body));
  const eh = "sha256:" + hex(await sha256(bytes));
  const sig = await ed.signAsync(bytes, sk);
  return {
    ...body,
    event_hash: eh,
    signature: "ed25519:" + Buffer.from(sig).toString("base64"),
  };
}

async function buildMerkle(leaves) {
  let level = leaves.map((s) => Buffer.from(s.replace("sha256:", ""), "hex"));
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(level[level.length - 1]);
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const buf = Buffer.concat([level[i], level[i + 1]]);
      next.push(Buffer.from(await sha256(new Uint8Array(buf))));
    }
    level = next;
  }
  return "sha256:" + level[0].toString("hex");
}

async function main() {
  console.log("[smoke] building 5 receipts...");
  const sk = ed.utils.randomPrivateKey();
  const receipts = [];
  let parent = null;
  for (let i = 0; i < 5; i++) {
    const r = await buildReceipt(sk, i, parent);
    receipts.push(r);
    parent = r.event_hash;
  }
  const root = await buildMerkle(receipts.map((r) => r.event_hash));
  console.log("[smoke] merkle root:", root);

  const chain = defineChain({
    ...baseSepolia,
    rpcUrls: { default: { http: [RPC] } },
  });
  const account = privateKeyToAccount(PRIV);
  const wallet = createWalletClient({ account, chain, transport: http(RPC) });
  const pub = createPublicClient({ chain, transport: http(RPC) });

  const data = "0x" + root.replace("sha256:", "").toLowerCase();
  console.log("[smoke] sending tx from", account.address, "→ self with data", data);
  const txHash = await wallet.sendTransaction({
    to: account.address,
    value: 0n,
    data,
    chain,
    account,
  });
  console.log("[smoke] txHash:", txHash);
  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  console.log("[smoke] block:", Number(receipt.blockNumber), "status:", receipt.status);
  console.log("[smoke] basescan:", `https://sepolia.basescan.org/tx/${txHash}`);
}

main().catch((e) => {
  console.error("[smoke] failed:", e);
  process.exit(1);
});
