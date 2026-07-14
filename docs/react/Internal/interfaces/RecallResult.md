# RecallResult

Defined in: [src/lib/memory/types.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#213)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#220)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#214)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#218)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#216)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#222)

Diagnostic: total memories in the vault when fact lane was queried.
