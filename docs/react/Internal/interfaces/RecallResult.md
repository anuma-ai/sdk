# RecallResult

Defined in: [src/lib/memory/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#245)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#252)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#246)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#250)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#248)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#254)

Diagnostic: total memories in the vault when fact lane was queried.
