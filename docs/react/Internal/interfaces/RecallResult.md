# RecallResult

Defined in: [src/lib/memory/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#186)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#193)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#187)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#191)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#189)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#195)

Diagnostic: total memories in the vault when fact lane was queried.
