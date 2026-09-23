# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2093](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2093)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2102](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2102)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2096](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2096)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2097](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2097)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2095](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2095)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2101](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2101)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2103](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2103)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2107](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2107)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2094](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2094)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2100)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
