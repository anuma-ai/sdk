# RecallResult

Defined in: [src/lib/memory/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#166)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#173)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#167)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#171)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#169)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#175)

Diagnostic: total memories in the vault when fact lane was queried.
