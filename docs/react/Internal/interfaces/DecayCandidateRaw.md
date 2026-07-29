# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2030](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2030)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2038](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2038)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2033](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2033)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2034](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2034)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2032](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2032)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2039](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2039)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2043](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2043)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2031](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2031)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2037](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2037)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
