# RecallResult

Defined in: [src/lib/memory/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#227)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#234)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#228)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#232)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#230)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#236)

Diagnostic: total memories in the vault when fact lane was queried.
