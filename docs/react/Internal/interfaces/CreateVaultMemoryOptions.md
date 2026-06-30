# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#34)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#35)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#41)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#44)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#52)

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

Defined in: [src/lib/db/memoryVault/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#39)

Folder ID for organization, null or omitted if unfiled

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#48)

Initial proof count. Defaults to 1 if omitted.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#37)

Scope for the memory. Defaults to "private" if omitted.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#50)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#46)

Source message IDs that produced this fact (auto-extraction provenance).
