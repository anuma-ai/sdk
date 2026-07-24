# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1487](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1487)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1495](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1495)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1490](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1490)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1491](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1491)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1489](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1489)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1496](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1496)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1500](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1500)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1488](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1488)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1494](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1494)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
