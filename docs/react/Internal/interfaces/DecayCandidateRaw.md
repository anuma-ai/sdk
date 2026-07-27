# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1539](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1539)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1547](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1547)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1542](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1542)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1543](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1543)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1541](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1541)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1548](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1548)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1552](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1552)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1540](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1540)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1546](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1546)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
