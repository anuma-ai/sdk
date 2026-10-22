# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1996](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1996)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2005](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2005)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1999](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1999)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2000](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2000)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1998](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1998)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2004](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2004)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2006](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2006)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2010](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2010)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1997](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1997)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2003](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2003)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
