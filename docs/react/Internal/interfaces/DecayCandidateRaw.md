# DecayCandidateRaw

Defined in: [src/lib/db/memoryVault/operations.ts:2022](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2022)

The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
shape in `memory/decay` plus the row id. Deliberately omits `content`
(encrypted) so the sweep stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2030](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2030)

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2025](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2025)

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2026](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2026)

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2024](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2024)

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2031](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2031)

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/operations.ts:2035](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2035)

`trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
are never handed to the optional content-reading decay classifier (they must
not egress poison content — see the decay sweeper's `isBorderline`).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2023](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2023)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2029](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2029)

Unix ms — the raw `updated_at`, used both for the age rule and as the
optimistic-concurrency guard passed back to [archiveVaultMemoryOp](../functions/archiveVaultMemoryOp.md).
