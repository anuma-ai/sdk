# RecallResult

Defined in: [src/lib/memory/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#171)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#178)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#172)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#176)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#174)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#180)

Diagnostic: total memories in the vault when fact lane was queried.
