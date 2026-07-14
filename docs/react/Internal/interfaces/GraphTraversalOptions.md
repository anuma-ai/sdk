# GraphTraversalOptions

Defined in: src/lib/memory/graphTraversal.ts:76

Options for [traverseGraphLane](../functions/traverseGraphLane.md). All optional; defaults are the
exported constants above. Exposed for ablation / evaluation sweeps.

## Properties

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: src/lib/memory/graphTraversal.ts:80

Max neighbor entities expanded per hop. Default [ENTITY\_FANOUT](../variables/ENTITY_FANOUT.md).

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: src/lib/memory/graphTraversal.ts:78

Total hops incl. the seed lookup (hop 1). Default [MAX\_HOPS](../variables/MAX_HOPS.md).

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: src/lib/memory/graphTraversal.ts:82

Hard cap on accumulated memory IDs. Default [NODE\_BUDGET](../variables/NODE_BUDGET.md).

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: src/lib/memory/graphTraversal.ts:84

RRF smoothing constant for per-hop fusion. Default 60 (rrf.ts).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: src/lib/memory/graphTraversal.ts:89

Vault size hint. When provided and above [VAULT\_SIZE\_HOP\_CAP](../variables/VAULT_SIZE_HOP_CAP.md), the
effective hop count is capped to 1 (see [capHopsForDensity](../functions/capHopsForDensity.md)).
