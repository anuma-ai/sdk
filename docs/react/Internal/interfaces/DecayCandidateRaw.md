# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2180](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2180)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2189](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2189)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2183](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2183)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2184](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2184)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2182](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2182)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2188](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2188)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2190](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2190)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2194](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2194)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2181](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2181)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2187](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2187)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
