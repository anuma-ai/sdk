# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2062](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2062)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2070](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2070)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2065](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2065)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2066](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2066)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2064](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2064)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2071](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2071)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2075](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2075)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2063](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2063)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2069](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2069)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
