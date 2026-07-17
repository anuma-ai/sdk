# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:872](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#872)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:880](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#880)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:875](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#875)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:876](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#876)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:874](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#874)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:881](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#881)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:873](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#873)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:879](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#879)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
