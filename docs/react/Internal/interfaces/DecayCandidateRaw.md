# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1971](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1971)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1980](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1980)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1974](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1974)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1975](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1975)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1973](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1973)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1979](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1979)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1981](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1981)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1985](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1985)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1972](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1972)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1978](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1978)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
