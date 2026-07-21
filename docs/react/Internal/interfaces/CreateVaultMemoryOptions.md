# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#61)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#62)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#68)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#71)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#79)

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

### factType?

> `optional` **factType**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/db/memoryVault/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#89)

Typed memory (PR1) — the extractor's classification for this fact.
Omit for manual/untyped saves (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#66)

Folder ID for organization, null or omitted if unfiled

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#75)

Initial proof count. Defaults to 1 if omitted.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#64)

Scope for the memory. Defaults to "private" if omitted.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#77)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#73)

Source message IDs that produced this fact (auto-extraction provenance).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#92)

Tier-0 security (PR3) — set "quarantined" when the injection screen
flagged this fact. Omit for the default (null/trusted).
