# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2007](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2007)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2016](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2016)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2010](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2010)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2011](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2011)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2009](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2009)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2015](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2015)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2017](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2017)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2021](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2021)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2008](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2008)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2014](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2014)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
