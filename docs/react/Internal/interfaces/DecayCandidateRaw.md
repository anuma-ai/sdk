# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1950](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1950)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1959](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1959)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1953](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1953)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1954](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1954)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1952](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1952)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1958](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1958)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1960](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1960)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1964](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1964)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1951](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1951)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1957](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1957)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
