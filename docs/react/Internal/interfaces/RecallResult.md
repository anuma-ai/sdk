# RecallResult

Defined in: [src/lib/memory/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#256)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#263)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#257)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:261](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#261)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:259](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#259)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:265](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#265)

Diagnostic: total memories in the vault when fact lane was queried.
