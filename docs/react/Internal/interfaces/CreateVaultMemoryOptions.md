# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:316](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#316)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#317)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#329)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#332)

Model that produced `embedding`. Persisted alongside it so a later
model change can detect and re-embed stale vectors.

***

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:364](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#364)

`false` creates the memory switched off.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:340](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#340)

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

> `optional` **factType**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"` | `"instruction"`

Defined in: [src/lib/db/memoryVault/types.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#350)

Typed memory (PR1) — the extractor's classification for this fact.
Omit for manual/untyped saves (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#327)

Folder ID for organization, null or omitted if unfiled

***

### geohash?

> `optional` **geohash**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:362](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#362)

Coarse geohash for location-tagged memory sources (landmarks/Trail).

***

### kind?

> `optional` **kind**: `"prompt"` | `"display_name"` | `"birth_date"` | `"bio"` | `"occupation"` | `"interest"` | `"gender"` | `"height_cm"` | `"looking_for"` | `"politics"` | `"religion"` | `"ethnicity"` | `"smoking"` | `"drinking"` | `"exercise"` | `"sexuality"` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#321)

Profile kind, or omit/null for a free-form memory.

***

### kindValue?

> `optional` **kindValue**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#323)

Canonical JSON value of a kinded memory.

***

### level?

> `optional` **level**: `"private"` | `"matching"` | `"profile"`

Defined in: [src/lib/db/memoryVault/types.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#325)

Who this memory reaches.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#336)

Initial proof count. Defaults to 1 if omitted.

***

### publishedAt?

> `optional` **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#360)

Round-trip slot for restore/import; see [visibility](#visibility).

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#319)

Scope for the memory.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:338](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#338)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#334)

Source message IDs that produced this fact (auto-extraction provenance).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:353](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#353)

Tier-0 security (PR3) — set "quarantined" when the injection screen
flagged this fact. Omit for the default (null/trusted).

***

### visibility?

> `optional` **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:358](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#358)

People Nearby cross-user visibility. Defaults to "private" if omitted —
creation NEVER publishes; use [setMemoryVisibilityOp](../functions/setMemoryVisibilityOp.md) so the
published\_at bookkeeping stays consistent. Accepted here only so bulk
restore/import paths can round-trip an existing visibility.
