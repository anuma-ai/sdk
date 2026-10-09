# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#279)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#280)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:292](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#292)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:295](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#295)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#303)

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

Defined in: [src/lib/db/memoryVault/types.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#313)

Typed memory (PR1) — the extractor's classification for this fact.
Omit for manual/untyped saves (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:290](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#290)

Folder ID for organization, null or omitted if unfiled

***

### geohash?

> `optional` **geohash**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#325)

Coarse geohash for location-tagged memory sources (landmarks/Trail).

***

### kind?

> `optional` **kind**: `"prompt"` | `"display_name"` | `"occupation"` | `"birth_date"` | `"bio"` | `"interest"` | `"gender"` | `"height_cm"` | `"looking_for"` | `"politics"` | `"religion"` | `"ethnicity"` | `"smoking"` | `"drinking"` | `"exercise"` | `"sexuality"` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#284)

Profile kind, or omit/null for a free-form memory.

***

### kindValue?

> `optional` **kindValue**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#286)

Canonical JSON value of a kinded memory.

***

### level?

> `optional` **level**: `"profile"` | `"private"` | `"matching"`

Defined in: [src/lib/db/memoryVault/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#288)

Who this memory reaches.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#299)

Initial proof count. Defaults to 1 if omitted.

***

### publishedAt?

> `optional` **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#323)

Round-trip slot for restore/import; see [visibility](#visibility).

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#282)

Scope for the memory.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#301)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#297)

Source message IDs that produced this fact (auto-extraction provenance).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:316](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#316)

Tier-0 security (PR3) — set "quarantined" when the injection screen
flagged this fact. Omit for the default (null/trusted).

***

### visibility?

> `optional` **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#321)

People Nearby cross-user visibility. Defaults to "private" if omitted —
creation NEVER publishes; use [setMemoryVisibilityOp](../functions/setMemoryVisibilityOp.md) so the
published\_at bookkeeping stays consistent. Accepted here only so bulk
restore/import paths can round-trip an existing visibility.
