# RecallResult

Defined in: [src/lib/memory/types.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#232)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#239)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#233)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#237)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#235)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#241)

Diagnostic: total memories in the vault when fact lane was queried.
