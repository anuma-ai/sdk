# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2044](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2044)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2052](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2052)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2047](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2047)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2048](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2048)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2046](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2046)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2053](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2053)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2057](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2057)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2045](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2045)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2051](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2051)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
