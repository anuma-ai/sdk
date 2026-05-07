/**
 * IndexedDB-backed hash-chained receipt store, mirroring the Python SQLite
 * `ReceiptChain`. Three Dexie tables:
 *
 *   runs             - one row per agent run boundary
 *   receipts         - signed receipts; hash-chain via `parent_hash`
 *   anchors          - on-chain anchor metadata per run
 *   tampered_backups - original payload before tamper(), for restore()
 *
 * Dexie's auto-incremented `++id` on `receipts` is storage-internal — used
 * as the lookup key for tamper/restore but never included in the canonical
 * receipt body. `getReceipts` strips it on read; `listReceiptRecords` exposes
 * it deliberately for the UI's tamper button.
 */
import { Dexie, type EntityTable, liveQuery, type Observable } from "dexie";

import type { Receipt } from "./receipt";
import { CANONICAL_FIELDS, verifyReceipt } from "./receipt";

export class ChainIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChainIntegrityError";
  }
}

type RunRow = {
  runId: string;
  agentId: string;
  startedAt: string;
  endedAt: string | null;
  /**
   * Optional chat id supplied by the host app. Persisted (non-indexed) so the
   * client can map `chatId → runId` later without an extra lookup table.
   */
  chatId?: string;
};

type ReceiptRow = Receipt & { id?: number; runId: string };

type AnchorRow = {
  runId: string;
  merkleRoot: string;
  txHash: string;
  blockNumber: number | null;
  chainId: number;
  anchoredAt: string;
  /**
   * Ordered `event_hash` list (without the `sha256:` prefix) that was used
   * to build the Merkle tree at anchor time. Persisted so verifier-URL
   * generation can reproduce the exact same proofs even if more receipts
   * are appended after the anchor lands. Optional for backward compat
   * with anchor rows written before this field existed.
   */
  anchoredLeaves?: string[];
  /**
   * Result of `verifyEndToEnd` against the run's final_decision receipt,
   * persisted so the shield's status survives reloads without a separate
   * client-side store. Optional for back-compat with older anchor rows.
   */
  verifyResult?: { ok: boolean; step: number; message: string };
};

type TamperedBackupRow = {
  storageId: number;
  originalPayloadJson: string;
  originalEventHash: string;
};

class PromptSealDb extends Dexie {
  runs!: EntityTable<RunRow, "runId">;
  receipts!: EntityTable<ReceiptRow, "id">;
  anchors!: EntityTable<AnchorRow, "runId">;
  tamperedBackups!: EntityTable<TamperedBackupRow, "storageId">;

  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({
      runs: "runId, agentId, startedAt",
      receipts: "++id, runId, [runId+id], event_hash, event_type, timestamp",
      anchors: "runId, txHash",
      tamperedBackups: "storageId",
    });
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Strip Dexie-internal fields, returning a clean canonical Receipt. */
function rowToReceipt(row: ReceiptRow): Receipt {
  const out: Record<string, unknown> = {};
  for (const k of CANONICAL_FIELDS) {
    out[k] = (row as Record<string, unknown>)[k];
  }
  out.event_hash = row.event_hash;
  out.signature = row.signature;
  return out as Receipt;
}

export type ReceiptRecord = {
  storageId: number;
  receipt: Receipt;
};

export class ReceiptChain {
  private readonly db: PromptSealDb;

  constructor(dbName: string = "promptseal") {
    this.db = new PromptSealDb(dbName);
  }

  async openRun(runId: string, agentId: string, chatId?: string): Promise<void> {
    await this.db.runs.put({
      runId,
      agentId,
      startedAt: nowIso(),
      endedAt: null,
      ...(chatId !== undefined ? { chatId } : {}),
    });
  }

  async closeRun(runId: string): Promise<void> {
    await this.db.runs.update(runId, { endedAt: nowIso() });
  }

  async latestEventHash(runId: string): Promise<string | null> {
    const row = await this.db.receipts
      .where("runId")
      .equals(runId)
      .last();
    return row?.event_hash ?? null;
  }

  async append(runId: string, receipt: Receipt): Promise<number> {
    const last = await this.latestEventHash(runId);
    if (receipt.parent_hash !== last) {
      throw new ChainIntegrityError(
        `parent_hash ${JSON.stringify(receipt.parent_hash)} does not match ` +
          `latest event_hash ${JSON.stringify(last)} for run ${JSON.stringify(runId)}`
      );
    }
    const ok = await verifyReceipt(receipt);
    if (!ok) {
      throw new ChainIntegrityError(
        "receipt failed signature/hash verification before insert"
      );
    }
    const id = await this.db.receipts.add({
      ...receipt,
      runId,
    } as ReceiptRow);
    return id as number;
  }

  async getReceipts(runId: string): Promise<Receipt[]> {
    const rows = await this.db.receipts.where("runId").equals(runId).sortBy("id");
    return rows.map(rowToReceipt);
  }

  async listReceiptRecords(runId: string): Promise<ReceiptRecord[]> {
    const rows = await this.db.receipts.where("runId").equals(runId).sortBy("id");
    return rows.map((row) => ({
      storageId: row.id as number,
      receipt: rowToReceipt(row),
    }));
  }

  async recordAnchor(
    runId: string,
    merkleRoot: string,
    txHash: string,
    blockNumber: number | null,
    chainId: number,
    anchoredLeaves?: string[]
  ): Promise<void> {
    await this.db.anchors.put({
      runId,
      merkleRoot,
      txHash,
      blockNumber,
      chainId,
      anchoredAt: nowIso(),
      anchoredLeaves,
    });
  }

  async getAnchor(runId: string): Promise<AnchorRow | undefined> {
    return await this.db.anchors.get(runId);
  }

  /**
   * Persist the result of `verifyEndToEnd` onto the anchor row. Lets the
   * client derive shield status from Dexie alone, surviving reloads without
   * a parallel client-side store.
   */
  async setVerifyResult(
    runId: string,
    result: { ok: boolean; step: number; message: string }
  ): Promise<void> {
    await this.db.anchors.update(runId, { verifyResult: result });
  }

  async listRunIds(): Promise<string[]> {
    const rows = await this.db.runs.orderBy("startedAt").toArray();
    return rows.map((r) => r.runId);
  }

  async verifyChain(runId: string): Promise<[true, null] | [false, string]> {
    const receipts = await this.getReceipts(runId);
    let previousHash: string | null = null;
    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i]!;
      if (r.parent_hash !== previousHash) {
        return [
          false,
          `receipt #${i} (id=${r.event_hash.slice(0, 14)}...) parent_hash ` +
            `mismatch: expected ${JSON.stringify(previousHash)}, got ${JSON.stringify(r.parent_hash)}`,
        ];
      }
      const ok = await verifyReceipt(r);
      if (!ok) {
        return [
          false,
          `receipt #${i} (id=${r.event_hash.slice(0, 14)}...) failed signature/hash verification`,
        ];
      }
      previousHash = r.event_hash;
    }
    return [true, null];
  }

  /**
   * Replace the row's `payload_excerpt` with garbage. Backs up the original
   * so `restore()` can put it back. Used by the demo's tamper button.
   */
  async tamper(storageId: number, replacement: string = '{"i":99}'): Promise<void> {
    const row = await this.db.receipts.get(storageId);
    if (!row) throw new Error(`no receipt with storageId ${storageId}`);
    const existing = await this.db.tamperedBackups.get(storageId);
    if (!existing) {
      await this.db.tamperedBackups.put({
        storageId,
        originalPayloadJson: JSON.stringify(row.payload_excerpt),
        originalEventHash: row.event_hash,
      });
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(replacement) as Record<string, unknown>;
    } catch {
      parsed = { tampered: replacement };
    }
    await this.db.receipts.update(storageId, { payload_excerpt: parsed });
  }

  async restore(storageId: number): Promise<void> {
    const backup = await this.db.tamperedBackups.get(storageId);
    if (!backup) return;
    const original = JSON.parse(backup.originalPayloadJson) as Record<string, unknown>;
    await this.db.receipts.update(storageId, { payload_excerpt: original });
    await this.db.tamperedBackups.delete(storageId);
  }

  /**
   * Live-query observable of receipts for *runId*, sorted by insertion.
   * Subscribe via `dexie-react-hooks#useLiveQuery` or RxJS-style `.subscribe`.
   */
  observe(runId: string): Observable<Receipt[]> {
    return liveQuery(async () => {
      return await this.getReceipts(runId);
    });
  }

  /**
   * Live-query observable resolving the most recent run row for *chatId*.
   * Used by the shield to look up `runId` from a chat without keeping a
   * parallel mapping in client state.
   *
   * `chatId` is non-indexed (added later, no schema bump), so this falls
   * back to a `filter()` table scan. Run counts per browser are tiny
   * (one per HR-screener invocation), so the linear scan is fine.
   */
  observeRunByChatId(
    chatId: string
  ): Observable<{ runId: string; agentId: string } | null> {
    return liveQuery(async () => {
      const matches = await this.db.runs
        .filter((row) => row.chatId === chatId)
        .sortBy("startedAt");
      const row = matches.length > 0 ? matches[matches.length - 1] : undefined;
      if (!row) return null;
      return { runId: row.runId, agentId: row.agentId };
    });
  }

  async clearAll(): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.runs,
      this.db.receipts,
      this.db.anchors,
      this.db.tamperedBackups,
      async () => {
        await this.db.runs.clear();
        await this.db.receipts.clear();
        await this.db.anchors.clear();
        await this.db.tamperedBackups.clear();
      }
    );
  }

  close(): void {
    this.db.close();
  }
}
