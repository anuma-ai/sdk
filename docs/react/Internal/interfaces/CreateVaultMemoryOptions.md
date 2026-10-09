# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#284)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#285)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#297)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#300)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:308](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#308)

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

Defined in: [src/lib/db/memoryVault/types.ts:318](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#318)

Typed memory (PR1) — the extractor's classification for this fact.
Omit for manual/untyped saves (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:295](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#295)

Folder ID for organization, null or omitted if unfiled

***

### geohash?

> `optional` **geohash**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#330)

Coarse geohash for location-tagged memory sources (landmarks/Trail).

***

### kind?

> `optional` **kind**: `"prompt"` | `"display_name"` | `"occupation"` | `"birth_date"` | `"bio"` | `"interest"` | `"gender"` | `"height_cm"` | `"looking_for"` | `"politics"` | `"religion"` | `"ethnicity"` | `"smoking"` | `"drinking"` | `"exercise"` | `"sexuality"` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#289)

Profile kind, or omit/null for a free-form memory.

***

### kindValue?

> `optional` **kindValue**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#291)

Canonical JSON value of a kinded memory.

***

### level?

> `optional` **level**: `"profile"` | `"private"` | `"matching"`

Defined in: [src/lib/db/memoryVault/types.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#293)

Who this memory reaches.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#304)

Initial proof count. Defaults to 1 if omitted.

***

### publishedAt?

> `optional` **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#328)

Round-trip slot for restore/import; see [visibility](#visibility).

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#287)

Scope for the memory.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#306)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:302](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#302)

Source message IDs that produced this fact (auto-extraction provenance).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#321)

Tier-0 security (PR3) — set "quarantined" when the injection screen
flagged this fact. Omit for the default (null/trusted).

***

### visibility?

> `optional` **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#326)

People Nearby cross-user visibility. Defaults to "private" if omitted —
creation NEVER publishes; use [setMemoryVisibilityOp](../functions/setMemoryVisibilityOp.md) so the
published\_at bookkeeping stays consistent. Accepted here only so bulk
restore/import paths can round-trip an existing visibility.
