# RecallResult

Defined in: [src/lib/memory/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#140)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#147)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#141)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#145)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#143)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#149)

Diagnostic: total memories in the vault when fact lane was queried.
