# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2122](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2122)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2131](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2131)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2125](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2125)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2126](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2126)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2124](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2124)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2130)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2132)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2136](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2136)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2123)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2129](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2129)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
