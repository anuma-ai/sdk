# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1929](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1929)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1938](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1938)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1932](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1932)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1933](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1933)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1931](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1931)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1937](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1937)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1939](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1939)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1943](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1943)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1930](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1930)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1936](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1936)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
