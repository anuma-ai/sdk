# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2074](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2074)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2082](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2082)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2077](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2077)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2078](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2078)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2076](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2076)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2083](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2083)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2087](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2087)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2075](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2075)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2081](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2081)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
