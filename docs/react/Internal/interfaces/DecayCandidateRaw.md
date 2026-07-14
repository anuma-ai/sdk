# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:833](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#833)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:841](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#841)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:836](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#836)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:837](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#837)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#835)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:842](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#842)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:834](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#834)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:840](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#840)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
