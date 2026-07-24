# RecallResult

Defined in: [src/lib/memory/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#238)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#245)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#239)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:243](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#243)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#241)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#247)

Diagnostic: total memories in the vault when fact lane was queried.
