# RecallResult

Defined in: [src/lib/memory/types.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#277)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#284)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#278)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#282)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#280)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#286)

Diagnostic: total memories in the vault when fact lane was queried.
