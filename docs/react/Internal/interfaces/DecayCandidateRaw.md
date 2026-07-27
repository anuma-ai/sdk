# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1672](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1672)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1680](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1680)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1675](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1675)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1676](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1676)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1674](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1674)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1681](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1681)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1685](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1685)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1673](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1673)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1679](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1679)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
