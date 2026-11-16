# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2100)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2109](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2109)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2103](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2103)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2104](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2104)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2102](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2102)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2108](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2108)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2110](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2110)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2114](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2114)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2101](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2101)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2107](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2107)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
