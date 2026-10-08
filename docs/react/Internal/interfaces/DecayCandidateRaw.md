# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1760](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1760)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1769](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1769)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1763](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1763)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1764](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1764)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1762](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1762)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1768](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1768)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1770](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1770)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1774](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1774)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1761](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1761)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1767](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1767)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
