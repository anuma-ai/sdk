# RecallResult

Defined in: [src/lib/memory/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#122)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#129)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#123)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#127)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#125)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#131)

Diagnostic: total memories in the vault when fact lane was queried.
