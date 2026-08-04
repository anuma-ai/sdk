# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2060](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2060)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2068](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2068)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2063](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2063)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2064](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2064)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2062](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2062)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2069](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2069)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2073](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2073)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2061](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2061)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2067](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2067)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
