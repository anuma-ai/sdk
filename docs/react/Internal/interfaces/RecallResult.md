# RecallResult

Defined in: [src/lib/memory/types.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#115)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#122)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#116)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#120)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#118)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#124)

Diagnostic: total memories in the vault when fact lane was queried.
