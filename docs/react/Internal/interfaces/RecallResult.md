# RecallResult

Defined in: [src/lib/memory/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#172)

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#179)

Diagnostic: total candidates considered before truncation.

***

### memories

> **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#173)

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#177)

Diagnostic: was the reranker invoked?

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#175)

Diagnostic: budget actually used (may downgrade if reranker fails).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#181)

Diagnostic: total memories in the vault when fact lane was queried.
