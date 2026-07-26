# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1516](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1516)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1524](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1524)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1519](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1519)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1520](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1520)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1518](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1518)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1525](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1525)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1529](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1529)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1517](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1517)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1523](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1523)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
