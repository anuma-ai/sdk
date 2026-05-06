/**
 * `useHiringDemo` — primary client integration point for the PromptSeal demo.
 *
 * Wires the hiring agent's tools + system prompt into `runToolLoop` and
 * attaches `createPromptSealHooks` so every LLM/tool boundary mints a signed
 * receipt into the IndexedDB chain. Provides the action set the demo UI
 * needs: run, anchor, tamper, restore, reset, plus a fragment-encoded
 * verifier URL.
 *
 * The hook is React-shape (returns plain state + actions) but does NOT
 * import React directly — callers wrap it in a `useState` if they want
 * automatic re-renders, or subscribe to `chain.observe(runId)` instead.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LlmapiMessage } from "../../client";
import { runToolLoop } from "../../lib/chat/toolLoop";
import { anchorRoot } from "../../promptseal/anchor";
import { base64ToBytes } from "../../promptseal/canonical";
import { ReceiptChain } from "../../promptseal/chain";
import { createPromptSealHooks } from "../../promptseal/hooks";
import { buildMerkle, inclusionProof } from "../../promptseal/merkle";
import type { Receipt } from "../../promptseal/receipt";

import { buildHiringSystemPrompt } from "./prompt";
import { findResume } from "./resumes";
import { createHiringTools } from "./tools";

const DEFAULT_RPC = "https://sepolia.base.org";
const DEFAULT_CHAIN_ID = 84532;
const DEFAULT_REGISTRY = "0x7177a6867296406881E20d6647232314736Dd09A" as const;
const DEFAULT_TOKEN_ID = 633;
const DEFAULT_DB_NAME = "promptseal-hiring-demo";
const DEFAULT_AGENT_ID = "hr-screener-v1";

export type HiringDemoState =
  | "idle"
  | "running"
  | "run-complete"
  | "anchored"
  | "error";

export type AnchorTxInfo = {
  txHash: string;
  blockNumber: number;
  merkleRoot: string;
};

export type FinalDecision = {
  decision: "hire" | "reject";
  candidate_id: string;
  reasoning: string;
};

export type UseHiringDemoOptions = {
  /** Demo wallet private key (Base Sepolia EOA) for anchor txs. */
  walletPrivateKey: `0x${string}`;
  /** Base64 of the agent's raw 32-byte Ed25519 secret seed. */
  agentSecretKey: string;
  /**
   * Bearer token / API key for `runToolLoop`. The demo wallet on Base
   * Sepolia is *separate* from the LLM API auth — anchoring uses the
   * wallet, model calls use the token.
   */
  llmToken?: string;
  agentTokenId?: number;
  rpcUrl?: string;
  chainId?: number;
  registryAddress?: `0x${string}`;
  /** LLM model id passed to `runToolLoop`. */
  model?: string;
  /** Override the IndexedDB database name (mostly useful for tests). */
  dbName?: string;
  /** Override the agent id stored on receipts. Defaults to "hr-screener-v1". */
  agentId?: string;
  /** Inject a custom transport for tests / fixture playback. */
  transport?: Parameters<typeof runToolLoop>[0]["transport"];
};

export type UseHiringDemoReturn = {
  run: (resumeId: string) => Promise<void>;
  anchor: () => Promise<{ txHash: `0x${string}`; blockNumber: number }>;
  tamper: (storageId: number) => Promise<void>;
  restore: (storageId: number) => Promise<void>;
  reset: () => Promise<void>;

  state: HiringDemoState;
  receipts: Receipt[];
  runId: string | null;
  chainOk: boolean | null;
  anchorTx: AnchorTxInfo | null;
  finalDecision: FinalDecision | null;
  error: string | null;

  /**
   * Build a verifier URL using the URL FRAGMENT (not the query string).
   * Receipts can be 1-3 KB and the fragment never leaves the client; the
   * query string risks an 8 KB ceiling.
   */
  buildVerifierUrl: (storageId: number, baseUrl: string) => Promise<string>;

  chain: ReceiptChain;
};

export function useHiringDemo(opts: UseHiringDemoOptions): UseHiringDemoReturn {
  const {
    walletPrivateKey,
    agentSecretKey,
    llmToken,
    agentTokenId = DEFAULT_TOKEN_ID,
    rpcUrl = DEFAULT_RPC,
    chainId = DEFAULT_CHAIN_ID,
    model = "claude-sonnet-4-6",
    dbName = DEFAULT_DB_NAME,
    agentId = DEFAULT_AGENT_ID,
    transport,
  } = opts;

  const chain = useMemo(() => new ReceiptChain(dbName), [dbName]);
  const skBytes = useMemo(() => base64ToBytes(agentSecretKey), [agentSecretKey]);

  const [state, setState] = useState<HiringDemoState>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [chainOk, setChainOk] = useState<boolean | null>(null);
  const [anchorTx, setAnchorTx] = useState<AnchorTxInfo | null>(null);
  const [finalDecision, setFinalDecision] = useState<FinalDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subscribedRunIdRef = useRef<string | null>(null);

  // Subscribe to the chain's live receipts whenever the runId changes.
  useEffect(() => {
    if (!runId) return undefined;
    if (subscribedRunIdRef.current === runId) return undefined;
    subscribedRunIdRef.current = runId;
    const sub = chain.observe(runId).subscribe({
      next: (rs) => setReceipts(rs),
      // eslint-disable-next-line no-console -- demo-level fallback
      error: (e) => console.warn("[useHiringDemo] observe error:", e),
    });
    return () => {
      sub.unsubscribe();
      subscribedRunIdRef.current = null;
    };
  }, [chain, runId]);

  const run = useCallback(
    async (resumeId: string) => {
      const resume = findResume(resumeId);
      if (!resume) {
        setError(`unknown resume id: ${resumeId}`);
        setState("error");
        return;
      }
      const newRunId = crypto.randomUUID();
      setRunId(newRunId);
      setReceipts([]);
      setChainOk(null);
      setAnchorTx(null);
      setFinalDecision(null);
      setError(null);
      setState("running");

      const hooks = createPromptSealHooks({
        chain,
        agentSecretKey: skBytes,
        agentId,
        agentTokenId,
      });

      const messages: LlmapiMessage[] = [
        { role: "system", content: [{ type: "text", text: buildHiringSystemPrompt() }] },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Please screen candidate resume ${resume.id}. ` +
                `Use the tools to parse, score, and decide.`,
            },
          ],
        },
      ];

      try {
        const result = await runToolLoop({
          messages,
          model,
          token: llmToken,
          tools: createHiringTools(),
          maxToolRounds: 6,
          temperature: 0,
          runId: newRunId,
          onLlmStart: hooks.onLlmStart,
          onLlmEnd: hooks.onLlmEnd,
          onToolStart: hooks.onToolStart,
          onToolEnd: hooks.onToolEnd,
          transport,
        });
        // Capture the decision tool's result if it came back successfully.
        const autoResults =
          "autoExecutedToolResults" in result ? result.autoExecutedToolResults : undefined;
        const decideResult = autoResults?.find((t) => t.name === "decide");
        if (decideResult?.result && typeof decideResult.result === "object") {
          const d = decideResult.result as Record<string, unknown>;
          if (d.decision === "hire" || d.decision === "reject") {
            setFinalDecision({
              decision: d.decision,
              candidate_id: String(d.candidate_id ?? resume.id),
              reasoning: String(d.reasoning ?? ""),
            });
          }
        }
        await chain.closeRun(newRunId);
        const [ok, reason] = await chain.verifyChain(newRunId);
        setChainOk(ok);
        if (!ok && reason) setError(reason);
        setReceipts(await chain.getReceipts(newRunId));
        setState(result.error ? "error" : "run-complete");
        if (result.error) setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    },
    [agentId, agentTokenId, chain, llmToken, model, skBytes, transport]
  );

  const anchor = useCallback(async () => {
    if (!runId) throw new Error("no active run");
    const rs = await chain.getReceipts(runId);
    if (rs.length === 0) throw new Error("no receipts to anchor");
    const tree = await buildMerkle(rs.map((r) => r.event_hash));
    const result = await anchorRoot({
      rootHex: tree.root,
      rpcUrl,
      chainId,
      privateKey: walletPrivateKey,
    });
    await chain.recordAnchor(
      runId,
      tree.root,
      result.txHash,
      result.blockNumber,
      chainId
    );
    setAnchorTx({
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      merkleRoot: tree.root,
    });
    setState("anchored");
    return { txHash: result.txHash, blockNumber: result.blockNumber };
  }, [chain, chainId, rpcUrl, runId, walletPrivateKey]);

  const tamper = useCallback(
    async (storageId: number) => {
      if (!runId) return;
      await chain.tamper(storageId);
      const [ok] = await chain.verifyChain(runId);
      setChainOk(ok);
      setReceipts(await chain.getReceipts(runId));
    },
    [chain, runId]
  );

  const restore = useCallback(
    async (storageId: number) => {
      if (!runId) return;
      await chain.restore(storageId);
      const [ok] = await chain.verifyChain(runId);
      setChainOk(ok);
      setReceipts(await chain.getReceipts(runId));
    },
    [chain, runId]
  );

  const reset = useCallback(async () => {
    await chain.clearAll();
    setRunId(null);
    setReceipts([]);
    setChainOk(null);
    setAnchorTx(null);
    setFinalDecision(null);
    setError(null);
    setState("idle");
  }, [chain]);

  const buildVerifierUrl = useCallback(
    async (storageId: number, baseUrl: string) => {
      if (!runId) throw new Error("no active run");
      const records = await chain.listReceiptRecords(runId);
      const idx = records.findIndex((r) => r.storageId === storageId);
      if (idx === -1) throw new Error(`receipt with storageId ${storageId} not found`);
      const receipt = records[idx]!.receipt;
      const proof = await inclusionProof(records.map((r) => r.receipt.event_hash), idx);
      const anchorRow = await chain.getAnchor(runId);
      const params = new URLSearchParams();
      params.set("receipt", JSON.stringify(receipt));
      params.set("proof", JSON.stringify(proof));
      if (anchorRow?.txHash) params.set("tx", anchorRow.txHash);
      const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      return `${trimmed}/#${params.toString()}`;
    },
    [chain, runId]
  );

  return {
    run,
    anchor,
    tamper,
    restore,
    reset,
    state,
    receipts,
    runId,
    chainOk,
    anchorTx,
    finalDecision,
    error,
    buildVerifierUrl,
    chain,
  };
}

export {
  DEFAULT_AGENT_ID,
  DEFAULT_CHAIN_ID,
  DEFAULT_DB_NAME,
  DEFAULT_REGISTRY,
  DEFAULT_RPC,
  DEFAULT_TOKEN_ID,
};
