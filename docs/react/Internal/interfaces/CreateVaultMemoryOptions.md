# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#196)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#197)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#203)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#206)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#214)

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

Defined in: [src/lib/db/memoryVault/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#224)

Typed memory (PR1) — the extractor's classification for this fact.
Omit for manual/untyped saves (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#201)

Folder ID for organization, null or omitted if unfiled

***

### geohash?

> `optional` **geohash**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#236)

Coarse geohash for location-tagged memory sources (landmarks/Trail).

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#210)

Initial proof count. Defaults to 1 if omitted.

***

### publishedAt?

> `optional` **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#234)

Round-trip slot for restore/import; see [visibility](#visibility).

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#199)

Scope for the memory. Defaults to "private" if omitted.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#212)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#208)

Source message IDs that produced this fact (auto-extraction provenance).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#227)

Tier-0 security (PR3) — set "quarantined" when the injection screen
flagged this fact. Omit for the default (null/trusted).

***

### visibility?

> `optional` **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#232)

People Nearby cross-user visibility. Defaults to "private" if omitted —
creation NEVER publishes; use [setMemoryVisibilityOp](../functions/setMemoryVisibilityOp.md) so the
published\_at bookkeeping stays consistent. Accepted here only so bulk
restore/import paths can round-trip an existing visibility.
