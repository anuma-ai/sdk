# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#90)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#91)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#97)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#100)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#108)

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

Defined in: [src/lib/db/memoryVault/types.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#118)

Typed memory (PR1) — the extractor's classification for this fact.
Omit for manual/untyped saves (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#95)

Folder ID for organization, null or omitted if unfiled

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#104)

Initial proof count. Defaults to 1 if omitted.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#93)

Scope for the memory. Defaults to "private" if omitted.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#106)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#102)

Source message IDs that produced this fact (auto-extraction provenance).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#121)

Tier-0 security (PR3) — set "quarantined" when the injection screen
flagged this fact. Omit for the default (null/trusted).
