# Reliable extraction and shared context assembly

`createDurableAutoExtractor` is the client extraction entry point. Create one
per authenticated database session. It requires the SDK v47 schema and models.

- Accepted turns enqueue source message IDs in `memory_extraction_jobs`, a
  device-local outbox. Plaintext message snapshots are never stored there.
- Initial extraction keeps the legacy six-message window unless `windowSize`
  overrides it. A legacy cursor resumes all subsequent messages. Scope changes
  do not enqueue previously observed or pending private sources again.
- Pass `scope` as an accessor (`() => scope`) so a privacy-mode flip is read at
  write time. A plain string is sampled once at construction, which makes
  correctness depend on the caller disposing and recreating the extractor on
  every flip; the accessor removes that requirement. An accessor that throws is
  treated as `"private"`. `folderId` is still sampled at construction — dispose
  and recreate on a folder change.
- The boundary between observed and unobserved history is anchored on
  `history.message_id` (the per-conversation ordinal, assigned max+1 and never
  reused), not on a message ID alone. Deleting the message that set the
  watermark therefore cannot lose the boundary. When a job still holds
  provenance that cannot be placed in the supplied window, nothing is enqueued:
  losing the place must never mean re-observing history under whatever scope is
  current. Clearing a conversation resets the anchor, so extraction starts over.
- Extraction reads encrypted history in batches of 20, with two overlapping
  messages for context. Pending batches resume when the worker is created. Each
  pass drains at most three jobs and reschedules the rest, so a long offline
  backlog does not run as one unbounded chain at app start.
- Partial retention and unavailable or locked sources remain pending. Failed
  jobs retry up to three times per worker session, then wait for a new turn or
  the next worker session. This is not an operating-system background service.
  A source ID that stays unresolvable across those attempts is dropped from the
  job (reported via `onError`) rather than blocking everything queued behind it.
- A batch that cannot extract does not block its conversation forever. The job
  row persists how many worker sessions its head batch has failed in
  (`failed_sessions`, keyed to that batch by `failed_head`), so neither a new
  turn nor a restart resets it; a new turn re-arms that session's retries
  without counting as another failed session. A non-retryable HTTP status
  (400/403/404) is not retried in the session that saw it, and a new turn does
  not re-arm it. After three failed sessions the batch is abandoned: its
  sources are acknowledged unextracted, reported via `onError`, and not re-sent
  as context for the next batch, so later messages still extract. Sources the
  store reports as undecryptable (`decryptionStatus`) for three sessions are
  dropped individually the same way. Ciphertext read without any key in the
  session is not counted — that is the session's state, not the batch's.
- `batchTimeoutMs` bounds a batch that never settles. By default it is the
  extraction call's own worst case — `extract.timeoutMs` (60s) ×
  `extract.maxAttempts` (3) plus backoff, or `extract.totalTimeoutMs` when
  smaller — plus a 120s retain budget, so it backstops the call's own timeouts
  rather than racing them. A batch past its ceiling is cancelled: its late
  writes are refused, so the retry cannot race it into duplicate rows. Its LLM
  call is not aborted and may still complete.
- A retried batch re-extracts, so a quarantined candidate reuses the audit row
  an earlier attempt wrote (same source IDs and normalised content) instead of
  adding another copy.
- Source ownership is not symmetric across a privacy flip. A private extractor
  forces a queued shared job to `private` — the direction that cannot publish —
  rather than honouring the job's own scope. A shared extractor never touches a
  queued private job's scope. So a turn queued under `shared` and drained under
  `private` is retained privately, by design.
- Source deletion and worker disposal prevent late writes. Message clearing and
  `deleteMessageOp` prune the outbox, and `deleteConversationOp` collects its
  jobs; callers deleting messages should use these operations instead of
  destroying history rows directly. The outbox is excluded from backup and
  restore — nothing enforces that beyond the exporters all being per
  conversation, so a whole-database exporter has to skip it explicitly.
- Replaying already-observed source IDs adds no evidence: proof count and
  `lastObservedAt` are skipped. The write itself still applies — a consolidation
  rewrite carries the same source IDs as the observation that triggered it, so
  discarding it lost the rewritten content and its embedding. Decay considers
  `lastObservedAt` — the rule, the classifier's age hint and its per-row
  verdict cache all age a row from the later of its last edit and last
  observation — and checks it again before archiving.

`assembleMemoryContext` and `shouldRecallMemory` are available from the pure
`@anuma/sdk/memory/context` entry point, as well as the existing SDK entry
points. The pure entry has no runtime React, native, or database imports.

```ts
import { assembleMemoryContext } from "@anuma/sdk/memory/context";

const result = await assembleMemoryContext({
  query,
  recall: storage.recall,
  loadFacts: storage.getVaultMemories,
  loadSessionRefs,
  memoryIds: topicMemoryIds, // undefined: all; []: none
  recallOptions: { budget: "low", excludeConversationId: conversationId },
});
```

The assembler combines bounded typed profile facts, ranked facts, conversation
excerpts, and prior-turn facts. It deduplicates the result and applies a 12,000
character content budget; callers still own prompt formatting and instruction
isolation. The `recalled` flag preserves ranked evidence when the profile lane
already included the same fact, so clients can display its actual recall score.

Topic membership filters every fact lane before ranking. Excerpts are disabled
for topic, folder, or scope-restricted assembly until they have equivalent
membership filtering; calling `recall` directly with `memoryIds` and
`types: ["chunk"]` reports `"chunks-scope-restricted"` on
`RecallDiagnostics.degraded` so that is distinguishable from an empty vault.
Query length and whitespace are not eligibility gates; only empty input and
exact trivial acknowledgments skip ranking. Failures are reported per lane and
never trigger an arbitrary whole-vault dump.

Release the SDK first, then update the client's SDK pin before merging the
client integration. Local validation uses a filesystem SDK override; that
override is development wiring, not a publishable dependency.

Schema v46 is additive (one `createTable`, no backfill), so a v45 database
upgrades cleanly; v47 adds two nullable columns to the same table (NULL reads
as "never failed"). Neither is reversible: WatermelonDB has no downgrade path,
so rolling a release back past a version after a device has run it resets that
device's local database. That matters for OTA, where a JS-only rollback can
land on a database the newer build already migrated.
