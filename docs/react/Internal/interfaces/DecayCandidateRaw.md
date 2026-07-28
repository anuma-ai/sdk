# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1944](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1944)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1952](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1952)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1947](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1947)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1948](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1948)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1946](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1946)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1953](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1953)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1957](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1957)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1945](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1945)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1951](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1951)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
