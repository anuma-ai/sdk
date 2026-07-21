# MemoriesNeedingTopicExtraction

Defined in: [src/lib/db/memoryVault/operations.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#835)

Result of [getMemoriesNeedingTopicExtractionOp](../functions/getMemoriesNeedingTopicExtractionOp.md): which memories the
background topic worker should run LLM entity extraction on, and which it
should merely stamp as already-extracted.

## Properties

### linkedUnstamped

> **linkedUnstamped**: `string`\[]

Defined in: [src/lib/db/memoryVault/operations.ts:851](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#851)

IDs of rows that already have entity links but no watermark — legacy rows
extracted by the conversation pipeline before v36. Grandfather these with
[stampTopicsExtractedAtOp](../functions/stampTopicsExtractedAtOp.md) (no LLM call) so a later content edit
makes them re-extractable instead of invisible forever. Bounded by the
same `limit` as [pending](#pending) — stamping loads a Model per row, so the
grandfather backlog is drained across sweeps rather than in one spike.

***

### pending

> **pending**: [`StoredVaultMemory`](StoredVaultMemory.md)\[]

Defined in: [src/lib/db/memoryVault/operations.ts:842](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#842)

Memories to run LLM topic extraction on (decrypted): never-extracted rows
with no entity links, plus stamped rows edited since their last pass
(`updated_at` > `topics_extracted_at`). Edited rows come first (they get
priority under `limit`), each group newest-created first.
