# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:860](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#860)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:868](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#868)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:863](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#863)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:864](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#864)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:862](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#862)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:869](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#869)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:861](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#861)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:867](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#867)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
