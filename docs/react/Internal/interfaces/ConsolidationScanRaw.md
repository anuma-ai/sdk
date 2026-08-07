# ConsolidationScanRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2306](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2306)

The content-light shape the background CONSOLIDATION sweep (Fix C) needs to
CLUSTER active rows by cosine before it decrypts anything. Mirrors
[DecayCandidateRaw](DecayCandidateRaw.md): plaintext scan columns only, NO `content` decrypt —
the sweep decrypts just the (small) clusters that actually near-duplicate.

## Properties

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2311)

JSON-stringified embedding vector; null on rows not yet embedded. A row
with no vector is invisible to cosine clustering — the sweep backfills those
separately (see [getUnembeddedVaultMemoryIdsOp](../functions/getUnembeddedVaultMemoryIdsOp.md)).

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2314](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2314)

Model that produced `embedding`. Clustering only compares rows sharing a
model (cosine across different embedding spaces is meaningless).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2316](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2316)

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2321)

Re-observation count; the survivor picker prefers the most-reinforced row.

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2315](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2315)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2307](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2307)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2319](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2319)

Unix ms `updated_at` — the cluster-cache version key: a re-observed row
(bumped `updated_at`) re-enters its cluster's re-evaluation.
