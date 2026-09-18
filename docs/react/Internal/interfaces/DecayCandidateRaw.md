# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2129](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2129)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2138](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2138)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2132)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2133](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2133)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2131](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2131)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2137](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2137)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2139](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2139)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2143](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2143)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2130)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2136](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2136)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
