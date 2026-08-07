# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2213](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2213)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2221](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2221)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2216](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2216)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2217](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2217)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2215)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2222)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2226](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2226)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2214)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2220)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
