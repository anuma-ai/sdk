# RecallResult

Defined in: [src/lib/memory/types.ts:265](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#265)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#272)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#266)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#270)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#268)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#274)

Diagnostic: total memories in the vault when fact lane was queried.
