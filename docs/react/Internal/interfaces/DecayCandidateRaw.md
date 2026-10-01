# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2115](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2115)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2124](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2124)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2118](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2118)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2119](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2119)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2117](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2117)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2123)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2125](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2125)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2129](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2129)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2116](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2116)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2122](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2122)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
