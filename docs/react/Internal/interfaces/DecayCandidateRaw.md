# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:1242](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1242)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1250](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1250)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1245)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1246](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1246)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1244)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:1251](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1251)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:1243](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1243)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:1249](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1249)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
