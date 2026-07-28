# RankableVaultMemory

Defined in: [src/lib/db/memoryVault/types.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#109)

Content-free projection of a vault memory, used to RANK candidates for recall
WITHOUT decrypting the (encrypted) `content` column. Everything here is a
plaintext-at-rest column — `embedding` is stored plaintext (schema v21), and
`folderId`/`updatedAt` drive source-filtering + tie-breaks. There is
deliberately NO `content` field: a ranking pass must never carry ciphertext
masquerading as the plaintext `StoredVaultMemory.content`. Decrypt the top-N
winners on demand via [getVaultMemoryOp](../functions/getVaultMemoryOp.md).

## Properties

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#120)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#117)

JSON-stringified embedding vector, null if not yet computed.

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#119)

Model that produced `embedding`. Null on legacy rows.

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#115)

Folder ID for organization, null if unfiled.

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#113)

Scope for partitioning memories (e.g., "private", "shared").

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#111)

WatermelonDB internal ID — pass to `getVaultMemoryOp` to decrypt on demand.

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#121)
