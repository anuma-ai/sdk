# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#44)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#45)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#51)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#54)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#62)

W6 temporal lane — when the event in this memory occurred.

**end**

> **end**: `number` | `null`

Unix ms timestamp of event end (range only).

**kind**

> **kind**: `"point"` | `"range"` | `"ongoing"` | `null`

Kind: 'point' | 'range' | 'ongoing' | null (or omit).

**start**

> **start**: `number` | `null`

Unix ms timestamp of event start (or point).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#49)

Folder ID for organization, null or omitted if unfiled

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#58)

Initial proof count. Defaults to 1 if omitted.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#47)

Scope for the memory. Defaults to "private" if omitted.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#60)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#56)

Source message IDs that produced this fact (auto-extraction provenance).
