# RecallResult

Defined in: [src/lib/memory/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#107)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#114)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#108)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#112)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#110)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#116)

Diagnostic: total memories in the vault when fact lane was queried.
