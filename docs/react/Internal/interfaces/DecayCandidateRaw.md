# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2133](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2133)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2142](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2142)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2136](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2136)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2137](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2137)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2135](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2135)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2141](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2141)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2143](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2143)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2147](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2147)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2134](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2134)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2140](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2140)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
