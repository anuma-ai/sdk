# RecallResult

Defined in: [src/lib/memory/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#262)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#269)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#263)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#267)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:265](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#265)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#271)

Diagnostic: total memories in the vault when fact lane was queried.
