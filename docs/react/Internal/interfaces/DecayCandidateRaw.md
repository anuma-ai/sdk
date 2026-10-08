# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1888](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1888)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1897](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1897)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1891](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1891)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1892](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1892)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1890](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1890)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1896](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1896)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1898](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1898)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1902](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1902)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1889](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1889)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1895](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1895)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
