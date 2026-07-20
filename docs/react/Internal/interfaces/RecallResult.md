# RecallResult

Defined in: [src/lib/memory/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#178)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#185)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#179)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#183)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#181)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#187)

Diagnostic: total memories in the vault when fact lane was queried.
