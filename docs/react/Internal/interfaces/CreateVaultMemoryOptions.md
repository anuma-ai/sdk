# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#206)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#207)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#213)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#216)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#224)

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

### facetKey?

> `optional` **facetKey**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#251)

Facet slot+value supersede (v43) — the closed `"<factType>:self:<slot>"`
key of a single-valued SELF standing attribute. The DB op re-validates it
(garbage → dropped) and only writes the pair when BOTH key and value are
valid. Omit for facet-less writes (persisted null).

***

### facetValue?

> `optional` **facetValue**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#254)

Facet slot+value supersede (v43) — the normalized current value token for
[facetKey](#facetkey). Only written alongside a valid [facetKey](#facetkey).

***

### factType?

> `optional` **factType**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/db/memoryVault/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#234)

Typed memory (PR1) — the extractor's classification for this fact.
Omit for manual/untyped saves (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#211)

Folder ID for organization, null or omitted if unfiled

***

### geohash?

> `optional` **geohash**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#246)

Coarse geohash for location-tagged memory sources (landmarks/Trail).

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#220)

Initial proof count. Defaults to 1 if omitted.

***

### publishedAt?

> `optional` **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#244)

Round-trip slot for restore/import; see [visibility](#visibility).

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#209)

Scope for the memory. Defaults to "private" if omitted.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#222)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#218)

Source message IDs that produced this fact (auto-extraction provenance).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#237)

Tier-0 security (PR3) — set "quarantined" when the injection screen
flagged this fact. Omit for the default (null/trusted).

***

### visibility?

> `optional` **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#242)

People Nearby cross-user visibility. Defaults to "private" if omitted —
creation NEVER publishes; use [setMemoryVisibilityOp](../functions/setMemoryVisibilityOp.md) so the
published\_at bookkeeping stays consistent. Accepted here only so bulk
restore/import paths can round-trip an existing visibility.
