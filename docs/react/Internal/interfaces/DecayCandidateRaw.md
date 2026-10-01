# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2160](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2160)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2169](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2169)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2163](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2163)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2164](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2164)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2162](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2162)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2168](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2168)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2170)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2174](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2174)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2161](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2161)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2167](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2167)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
