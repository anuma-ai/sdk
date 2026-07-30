# ConsolidationScanRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2123)

The content-light shape the background CONSOLIDATION sweep (Fix C) needs to
CLUSTER active rows by cosine before it decrypts anything. Mirrors
[DecayCandidateRaw](DecayCandidateRaw.md): plaintext scan columns only, NO `content` decrypt —
the sweep decrypts just the (small) clusters that actually near-duplicate.

## Properties

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2128](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2128)

JSON-stringified embedding vector; null on rows not yet embedded. A row
with no vector is invisible to cosine clustering — the sweep backfills those
separately (see [getUnembeddedVaultMemoryIdsOp](../functions/getUnembeddedVaultMemoryIdsOp.md)).

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2131](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2131)

Model that produced `embedding`. Clustering only compares rows sharing a
model (cosine across different embedding spaces is meaningless).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2133](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2133)

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2138](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2138)

Re-observation count; the survivor picker prefers the most-reinforced row.

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2132)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2124](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2124)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2136](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2136)

Unix ms `updated_at` — the cluster-cache version key: a re-observed row
(bumped `updated_at`) re-enters its cluster's re-evaluation.
