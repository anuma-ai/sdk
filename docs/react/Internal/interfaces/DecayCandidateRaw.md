# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:778](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#778)

The minimal plaintext shape the decay sweep needs — mirrors
import("../../memory/decay").DecayInput plus the row id. Deliberately
omits `content` (encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:786](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#786)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:781](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#781)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:782](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#782)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:780](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#780)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:787](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#787)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:779](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#779)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:785](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#785)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
