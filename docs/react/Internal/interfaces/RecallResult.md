# RecallResult

Defined in: [src/lib/memory/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#270)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#277)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#271)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#275)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#273)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#279)

Diagnostic: total memories in the vault when fact lane was queried.
