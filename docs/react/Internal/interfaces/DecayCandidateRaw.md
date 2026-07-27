# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1507](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1507)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1515](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1515)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1510](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1510)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1511](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1511)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1509](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1509)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1516](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1516)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1520](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1520)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1508](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1508)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1514](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1514)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
