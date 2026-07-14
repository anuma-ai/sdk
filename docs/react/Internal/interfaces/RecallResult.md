# RecallResult

Defined in: [src/lib/memory/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#197)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#204)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#198)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#202)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#200)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#206)

Diagnostic: total memories in the vault when fact lane was queried.
