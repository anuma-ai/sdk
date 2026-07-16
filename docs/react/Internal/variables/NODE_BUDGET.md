# NODE\_BUDGET

> `const` **NODE\_BUDGET**: `64` = `64`

Defined in: [src/lib/memory/graphTraversal.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#84)

Hard ceiling on total accumulated memory IDs across all hops. The BFS stops
expanding once the accumulated set reaches this size (and the frontier is
bounded to it too), keeping the RRF pool — and the downstream reranker
workload — bounded regardless of graph density.
