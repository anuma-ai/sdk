/**
 * Ingest server-extracted photo memories into the local vault.
 *
 * A photo uploaded to People Nearby is read by the server, which extracts
 * durable facts about the user, embeds them and publishes them
 * (anuma-ai/nearby#114). Until those rows reach the device they exist only
 * server-side: the user's own assistant cannot recall them, and no screen can
 * show them — so the "visible and deletable" promise the design makes is not
 * kept. This is the path that brings them home.
 *
 * Three things about the shape of this, each of which is load-bearing:
 *
 *  1. **It takes rows; it does not fetch them.** The publish reconciler already
 *     calls `listPublished()` on every pass and gets `text`, `media[]`,
 *     `event_time` and `user_authored` back. Ingest consumes that response. No
 *     new endpoint, no second network call, no change to nearby's API.
 *
 *  2. **The vault row's id IS the server's `memory_id`.** That is what makes a
 *     revoke addressable: the reconciler's ledger, its published set and its
 *     `toRevoke` list are all keyed on that id, so a locally-minted id would
 *     leave the user with a switch that cannot reach the row it appears to
 *     control. It is also what makes ingest idempotent for free — a second pass
 *     sees the id already present and writes nothing.
 *
 *  3. **These rows never go through `retain()`.** That path is for facts being
 *     learned on-device: it dedupes and merges candidates against local rows and
 *     mints its own ids, both of which would break (2). A photo memory is not a
 *     candidate to be reconciled against the vault — it is an already-decided
 *     fact the server has published.
 *
 * The rows are written `scope: "shared"` because they genuinely ARE published.
 * `scope === 'shared'` is the publication axis — the single one. The reconciler
 * reads local scope as the user's intent, and it builds its `local` set from a
 * vault read narrowed to `{scopes: ['shared']}`. A row stamped anything else
 * never enters that read, so it is never adopted into the publish ledger, and
 * `toRevoke` is computed only over ids the ledger holds. The user's off-toggle
 * would then do nothing server-side while nearby kept serving the memory. The
 * `visibility` column is legacy: nothing reads it any more. They carry
 * `source: SOURCE_PHOTO`, which is what exempts them from decay's auto-archive;
 * see the note there for why archiving one would silently unpublish it.
 *
 * No embedding is computed here. `searchTool`'s un-embedded lane embeds any row
 * lacking a vector at search time, uses it in that same search and persists it
 * via `updateVaultMemoryEmbeddingOp` — so a row ingested without one is picked
 * up on first recall rather than costing an embedding call at ingest.
 */

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

/** The server namespace ingest accepts. Mirrors nearby's `photoMemoryIDPrefix`. */
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
  // Deduplicate BY ID as we filter. Every row here is prepared with the server's
  // memory_id as its primary key, so two entries carrying the same id would be
  // two creates of the same key — which throws out of `database.batch` and takes
  // the whole ingest with it, including the unrelated rows that were fine. A
  // repeated id is one memory, so first-wins is the honest collapse.
  const byId = new Map<string, PublishedPhotoMemory>();
  for (const r of rows) {
    if (typeof r.memoryId !== "string" || !r.memoryId.startsWith(PHOTO_MEMORY_ID_PREFIX)) continue;
    if (!byId.has(r.memoryId)) byId.set(r.memoryId, r);
  }
  const photoRows = [...byId.values()];
  if (photoRows.length === 0) return { inserted: 0, skipped: 0 };

  // Cheap pre-filter so the encryption below only runs for rows we plausibly
  // need. NOT authoritative — the check that decides is inside the write block,
  // where WatermelonDB's writer lock makes read-then-create atomic. One query for
  // the whole batch rather than one per row: a published set is up to
  // MaxListPublished (500) rows and this runs on every reconcile pass.
  const known = await ctx.vaultMemoryCollection
    .query()
    .fetchIds()
    .then((ids: string[]) => new Set(ids));

  const candidates = photoRows.filter((r) => !known.has(r.memoryId));
  if (candidates.length === 0) return { inserted: 0, skipped: photoRows.length };
  const fresh = candidates;

  // Encrypt outside the write transaction — signing can prompt a wallet, and
  // holding a WatermelonDB write open across that is how the DB deadlocks.
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
    // Re-check INSIDE the writer. Between the pre-filter above and here another
    // pass could have created these rows: `database.write` serializes writers, so
    // this read and the batch below are atomic with respect to any other write,
    // while the pre-filter was not. Without it two overlapping passes both see a
    // row as absent and the loser throws on the duplicate key.
    const present = new Set(await ctx.vaultMemoryCollection.query().fetchIds());
    const writable = fresh
      .map((row, i) => ({ row, content: contents[i] }))
      .filter(({ row }) => !present.has(row.memoryId));
    inserted = writable.length;
    if (writable.length === 0) return;
    const prepared = writable.map(({ row, content }) =>
      ctx.vaultMemoryCollection.prepareCreate((record) => {
        // The server's id becomes the row id. See (2) in the file header.
        // WatermelonDB assigns a random id in prepareCreate and exposes no typed
        // hook to override it, so the raw handle is the only way in.
        (record._raw as { id: string }).id = row.memoryId;
        record._setRaw("content", content);
        // Published, so `shared` — see the header. This is the field the
        // reconciler's published-set read (`{scopes:['shared']}`) and its
        // `isPublic` both key on. A row outside that read can never reach the
        // ledger, and therefore can never be revoked.
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
        // `visibility` is a dead column — the scope above is what publication
        // reads. It is still stamped for stored-data compatibility: rows travel
        // between devices by backup sync, and a build old enough to still read
        // this column must see the row as published, not revoke it as private.
        // `published_at` records when the SERVER published it.
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
