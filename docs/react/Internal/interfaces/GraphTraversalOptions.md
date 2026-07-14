# GraphTraversalOptions

Defined in: [src/lib/memory/graphTraversal.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#86)

Options for [traverseGraphLane](../functions/traverseGraphLane.md). All optional; defaults are the
exported constants above. Exposed for ablation / evaluation sweeps.

## Properties

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#90)

Max neighbor entities expanded per hop. Default [ENTITY\_FANOUT](../variables/ENTITY_FANOUT.md).

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#88)

Total hops incl. the seed lookup (hop 1). Default [MAX\_HOPS](../variables/MAX_HOPS.md).

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#92)

Hard cap on accumulated memory IDs. Default [NODE\_BUDGET](../variables/NODE_BUDGET.md).

***

### refineNeighbors?

> `optional` **refineNeighbors**: [`NeighborRefiner`](NeighborRefiner.md)

Defined in: [src/lib/memory/graphTraversal.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#107)

PR5 — optional LLM neighbor-selection. When provided, at each expansion hop
the deterministically-ranked candidate neighbor entities are handed to this
refiner, which returns the subset to expand. Falls back to the
co-occurrence order on any error or empty result. Called at most ONCE per
hop. Build one with [createLlmNeighborRefiner](../functions/createLlmNeighborRefiner.md), or supply your own.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#94)

RRF smoothing constant for per-hop fusion. Default 60 (rrf.ts).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#99)

Vault size hint. When provided and above [VAULT\_SIZE\_HOP\_CAP](../variables/VAULT_SIZE_HOP_CAP.md), the
effective hop count is capped to 1 (see [capHopsForDensity](../functions/capHopsForDensity.md)).
