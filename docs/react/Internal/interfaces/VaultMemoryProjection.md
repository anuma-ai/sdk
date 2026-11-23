# VaultMemoryProjection

Defined in: [src/lib/db/memoryVault/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#270)

## Extends

* [`RankableVaultMemory`](RankableVaultMemory.md)

## Properties

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#250)

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`createdAt`](RankableVaultMemory.md#createdat)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#247)

JSON-stringified embedding vector, null if not yet computed.

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`embedding`](RankableVaultMemory.md#embedding)

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#249)

Model that produced `embedding`. Null on legacy rows.

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`embeddingModel`](RankableVaultMemory.md#embeddingmodel)

***

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#273)

See [StoredVaultMemory.enabled](StoredVaultMemory.md#enabled).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#245)

Folder ID for organization, null if unfiled.

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`folderId`](RankableVaultMemory.md#folderid)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#266)

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

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`lastObservedAt`](RankableVaultMemory.md#lastobservedat)

***

### recallCount?

> `optional` **recallCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#275)

See [StoredVaultMemory.recallCount](StoredVaultMemory.md#recallcount).

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:243](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#243)

Scope for partitioning memories (e.g., "private", "shared").

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`scope`](RankableVaultMemory.md#scope)

***

### topicsUserManaged

> **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#271)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#241)

WatermelonDB internal ID — pass to `getVaultMemoryOp` to decrypt on demand.

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`uniqueId`](RankableVaultMemory.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#251)

**Inherited from**

[`RankableVaultMemory`](RankableVaultMemory.md).[`updatedAt`](RankableVaultMemory.md#updatedat)
