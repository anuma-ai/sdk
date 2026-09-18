# RecallResult

Defined in: [src/lib/memory/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#271)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#278)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#272)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:276](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#276)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#274)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#280)

Diagnostic: total memories in the vault when fact lane was queried.
