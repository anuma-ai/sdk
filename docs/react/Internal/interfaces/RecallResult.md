# RecallResult

Defined in: [src/lib/memory/types.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#298)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#305)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#299)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#303)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#301)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:307](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#307)

Diagnostic: total memories in the vault when fact lane was queried.
