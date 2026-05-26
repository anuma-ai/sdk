# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#56)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#57)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#63)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#71)

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

Defined in: [src/lib/db/memoryVault/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#61)

If provided, moves the memory to this folder.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#67)

Set absolute proof count. Used during merge to increment.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#59)

If provided, updates the memory's scope.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#69)

Set source ("manual" | "auto-extracted" | "capsule").

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#65)

Replace source-chunk-ids list (used during merge to accumulate provenance).
