# RankableVaultMemory

Defined in: [src/lib/db/memoryVault/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#218)

Content-free projection of a vault memory, used to RANK candidates for recall
WITHOUT decrypting the (encrypted) `content` column. Everything here is a
plaintext-at-rest column — `embedding` is stored plaintext (schema v21), and
`folderId`/`updatedAt` drive source-filtering + tie-breaks. There is
deliberately NO `content` field: a ranking pass must never carry ciphertext
masquerading as the plaintext `StoredVaultMemory.content`. Decrypt the top-N
winners on demand via [getVaultMemoryOp](../functions/getVaultMemoryOp.md).

## Extended by

* [`VaultMemoryProjection`](VaultMemoryProjection.md)

## Properties

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#229)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#226)

JSON-stringified embedding vector, null if not yet computed.

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#228)

Model that produced `embedding`. Null on legacy rows.

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#224)

Folder ID for organization, null if unfiled.

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#245)

C3 re-observation watermark (`last_observed_at`), Unix ms or null — the
same column [StoredVaultMemory.lastObservedAt](StoredVaultMemory.md#lastobservedat) carries. A retain()
consolidation `update` rewrites `content` under `preserveUpdatedAt`, so
`updatedAt` stays pinned and only this column moves. A consumer that
decides "has this row changed since I last sent it" from `updatedAt` alone
(the Nearby publish reconciler) never sees that rewrite; it must take
`max(updatedAt, lastObservedAt)`.

OPTIONAL, not just nullable: `RankableVaultMemory` is a public exported
type, and this field is new. Required would break any existing consumer
constructing a literal of this shape (a test fixture, a mock) — the same
reason every other watermark field of this kind in this package
(memory/types.ts, memoryVault/searchTool.ts) is optional rather than
required. `vaultMemoryRawToRankable` still always sets it.

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#222)

Scope for partitioning memories (e.g., "private", "shared").

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#220)

WatermelonDB internal ID — pass to `getVaultMemoryOp` to decrypt on demand.

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#230)
