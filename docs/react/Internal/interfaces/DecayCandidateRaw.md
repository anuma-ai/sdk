# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:808](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#808)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:816](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#816)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:811](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#811)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:812](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#812)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:810](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#810)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:817](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#817)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:809](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#809)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:815](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#815)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
