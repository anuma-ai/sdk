# RecallResult

Defined in: [src/lib/memory/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#278)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#285)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#279)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:283](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#283)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#281)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#287)

Diagnostic: total memories in the vault when fact lane was queried.
