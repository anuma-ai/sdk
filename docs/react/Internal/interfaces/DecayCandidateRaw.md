# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1265](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1265)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1273](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1273)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1268)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1269](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1269)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1267](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1267)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1274](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1274)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1279](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1279)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see ../../memory/decayWorker's
`isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1266)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1272](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1272)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
