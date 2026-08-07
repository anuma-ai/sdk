# MemoriesNeedingTopicExtraction

Defined in: [src/lib/db/memoryVault/operations.ts:1659](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1659)

Result of [getMemoriesNeedingTopicExtractionOp](../functions/getMemoriesNeedingTopicExtractionOp.md): which memories the
background topic worker should run LLM entity extraction on, and which it
should merely stamp as already-extracted.

## Properties

### linkedUnstamped

> **linkedUnstamped**: `string`\[]

Defined in: [src/lib/db/memoryVault/operations.ts:1678](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1678)

IDs of rows that already have entity links but no watermark — legacy rows
extracted by the conversation pipeline before v36. Grandfather these with
[stampTopicsExtractedAtOp](../functions/stampTopicsExtractedAtOp.md) (no LLM call) so a later content edit
makes them re-extractable instead of invisible forever. Bounded by the
same `limit` as [pending](#pending) — stamping loads a Model per row, so the
grandfather backlog is drained across sweeps rather than in one spike.

***

### pending

> **pending**: [`StoredVaultMemory`](StoredVaultMemory.md)\[]

Defined in: [src/lib/db/memoryVault/operations.ts:1669](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1669)

Memories to run LLM topic extraction on (decrypted): never-extracted rows
with no entity links, plus stamped rows edited since their last pass
(`updated_at` > `topics_extracted_at`) or extracted under an older
`topics_extracted_version` than [TOPICS\_EXTRACTION\_VERSION](../variables/TOPICS_EXTRACTION_VERSION.md), plus the
pre-v42-restore repair: a stamped row left with neither links nor a `topics`
record, which no no-LLM bucket can reach. Edited / stale-version rows come
first (they get priority under `limit`), each group newest-created first.

***

### topicsBackfill

> **topicsBackfill**: `string`\[]

Defined in: [src/lib/db/memoryVault/operations.ts:1705](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1705)

IDs that have links but no `topics` record at all — rows predating v42,
whose topics would otherwise never reach the server. Fill with
[backfillMemoryTopicsOp](../functions/backfillMemoryTopicsOp.md) (no LLM call), which derives the record from
the links already there.

Also includes user-managed rows, for the same reason: a curated memory's
topics are exactly the ones worth preserving across a migration. Bounded by
`limit` because filling `topics` bumps `topics_updated_at` and so re-uploads
the row (embedding included) — uncapped, the first sweep after upgrade would
re-upload the entire vault at once. Rows already in [pending](#pending) are
excluded: their imminent LLM pass writes `topics` anyway.

***

### topicsToRelink

> **topicsToRelink**: `string`\[]

Defined in: [src/lib/db/memoryVault/operations.ts:1691](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1691)

IDs whose `topics` record disagrees with their `memory_entity` links — the
restored-device case, where the synced record arrived but the device-local
index (which can never sync) did not. Rebuild with
[relinkMemoryTopicsOp](../functions/relinkMemoryTopicsOp.md): no LLM call, and no `memory_vault` write, so a
restore doesn't re-upload the vault.

INCLUDES user-managed rows. A curated memory's index needs rebuilding just
like an auto one, and the flag it arrives with is what keeps the autotagger
off it — so unlike [pending](#pending) / [linkedUnstamped](#linkedunstamped), this bucket is
not filtered by ownership. Bounded by `limit`.
