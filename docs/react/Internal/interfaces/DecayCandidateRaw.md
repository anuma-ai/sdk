# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2181](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2181)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2190](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2190)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2184](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2184)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2185](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2185)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2183](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2183)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2189](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2189)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2191](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2191)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2195](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2195)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2182](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2182)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2188](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2188)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
