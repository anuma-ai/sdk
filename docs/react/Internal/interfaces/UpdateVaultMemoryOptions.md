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

Defined in: [src/lib/db/memoryVault/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#76)

W6 temporal lane — write the event-time fields on update. Use during
auto-merge to preserve (or refine) the original event-time signal when
a new observation lands on an existing fact. Omit to leave the
existing values untouched.

**end**

> **end**: `number` | `null`

**kind**

> **kind**: `"point"` | `"range"` | `"ongoing"` | `null`

**start**

> **start**: `number` | `null`

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
