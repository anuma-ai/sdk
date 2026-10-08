import { SOURCE_PHOTO } from "../../memory/decay.js";
import { encryptVaultMemoryContent } from "./encryption";
import type { VaultMemoryOperationsContext } from "./operations";
import type { PhotoMediaRef } from "./types";

/**
 * One row of `GET /api/memories/published`, narrowed to what ingest needs.
 *
 * Deliberately structural rather than an import from the transport client: this
 * op is in the SDK and the two hand-written nearby clients live in the app, so
 * a shared nominal type would drag one across a package boundary for no gain.
 */
export interface PublishedPhotoMemory {
  /** The server-minted memory id. `photo:<feedItemID>:fact:NN` or `:caption`. */
  memoryId: string;
  /** The projected fact text. */
  text: string;
  /** The photo(s) this fact was read out of. */
  media?: PhotoMediaRef[] | null;
  /** When the event in the memory happened, if the server knows. */
  eventTime?: {
    start: number | null;
    end: number | null;
    kind: "point" | "range" | "ongoing" | null;
  } | null;
  /** True when the text is the user's own words (a kept caption). */
  userAuthored?: boolean;
}

const PHOTO_MEMORY_ID_PREFIX = "photo:";

/** What one ingest pass did, for the caller's logs and tests. */
export interface PhotoIngestResult {
  /** Rows newly written to the vault. */
  inserted: number;
  /** Rows already present, left untouched. */
  skipped: number;
}

/**
 * Write the published photo memories this vault does not already have.
 *
 * Idempotent on `memoryId`: a row whose id is already in the vault is counted as
 * skipped and NOT rewritten, even when the server's text has since changed.
 * That is deliberate — the local row is the user's copy, they may have edited
 * it, and silently overwriting an edit to match the server would be the same
 * class of bug as publishing a version the user has since changed. Re-ingesting
 * changed text is a follow-up that needs a merge decision, not a clobber.
 *
 * That skip is also why this op does NOT repair a row an older build stamped
 * `scope: "private"`. Such a row is present, so ingest leaves it alone, and it
 * stays outside the published-set read. The user's switch cannot revoke it.
 * Repair belongs in a one-time pass at upgrade. Do not add it here, for two
 * reasons:
 *
 *  - **The two states are indistinguishable from this op.** After this build a
 *    `photo:` row with `scope: "private"` is also exactly what the user's own
 *    off-toggle produces. The toggle calls `updateVaultMemoryOp`, which writes
 *    `scope` and never touches `visibility`, so the mis-stamped row and the
 *    turned-off row carry identical columns. No test here can tell them apart.
 *
 *  - **A re-stamp here would revert the off-toggle.** The pass runs ingest
 *    BEFORE it reads the vault, so a row re-stamped `shared` re-enters the
 *    desired set on that same pass and never reaches `toRevoke`. The switch
 *    would spring back to "on" and nearby would keep serving the memory. That
 *    is worse than the bug it repairs.
 *
 * A one-time pass does not have the ambiguity. Before this build the switch
 * already read "off" for these rows, because it reads `scope`, so no user can
 * have turned one off. Every `private` photo row at that instant came from the
 * old stamp.
 *
 * Non-`photo:` ids are ignored: everything else in the published set is a
 * client-published memory that by definition already lives in this vault (or in
 * another device's, which is not ours to recreate).
 */
export async function ingestPublishedPhotoMemoriesOp(
  ctx: VaultMemoryOperationsContext,
  rows: PublishedPhotoMemory[]
): Promise<PhotoIngestResult> {
  const byId = new Map<string, PublishedPhotoMemory>();
  for (const r of rows) {
    if (typeof r.memoryId !== "string" || !r.memoryId.startsWith(PHOTO_MEMORY_ID_PREFIX)) continue;
    if (!byId.has(r.memoryId)) byId.set(r.memoryId, r);
  }
  const photoRows = [...byId.values()];
  if (photoRows.length === 0) return { inserted: 0, skipped: 0 };

  const known = await ctx.vaultMemoryCollection
    .query()
    .fetchIds()
    .then((ids: string[]) => new Set(ids));

  const candidates = photoRows.filter((r) => !known.has(r.memoryId));
  if (candidates.length === 0) return { inserted: 0, skipped: photoRows.length };
  const fresh = candidates;

  const contents = await Promise.all(
    fresh.map(async (r) => {
      if (ctx.walletAddress && ctx.signMessage) {
        return encryptVaultMemoryContent(
          r.text,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
      }
      return r.text;
    })
  );

  const now = Date.now();
  let inserted = 0;
  await ctx.database.write(async () => {
    const present = new Set(await ctx.vaultMemoryCollection.query().fetchIds());
    const writable = fresh
      .map((row, i) => ({ row, content: contents[i] }))
      .filter(({ row }) => !present.has(row.memoryId));
    inserted = writable.length;
    if (writable.length === 0) return;
    const prepared = writable.map(({ row, content }) =>
      ctx.vaultMemoryCollection.prepareCreate((record) => {
        (record._raw as { id: string }).id = row.memoryId;
        record._setRaw("content", content);
        record._setRaw("scope", "shared");
        record._setRaw("folder_id", null);
        record._setRaw("user_id", ctx.userId ?? null);
        record._setRaw("is_deleted", false);
        record._setRaw("proof_count", 1);
        record._setRaw("source", SOURCE_PHOTO);
        record._setRaw(
          "media",
          row.media && row.media.length > 0 ? JSON.stringify(row.media) : null
        );
        record._setRaw("visibility", "public");
        record._setRaw("published_at", now);
        if (row.eventTime) {
          record._setRaw("event_time_start", row.eventTime.start ?? null);
          record._setRaw("event_time_end", row.eventTime.end ?? null);
          record._setRaw("event_time_kind", row.eventTime.kind ?? null);
        }
      })
    );
    await ctx.database.batch(...prepared);
  });

  return { inserted, skipped: photoRows.length - inserted };
}
