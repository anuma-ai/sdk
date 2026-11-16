# RecallResult

Defined in: [src/lib/memory/types.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#297)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#304)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#298)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:302](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#302)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#300)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#306)

Diagnostic: total memories in the vault when fact lane was queried.
