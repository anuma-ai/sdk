# MAX\_HOPS

> `const` **MAX\_HOPS**: `2` = `2`

Defined in: [src/lib/memory/graphTraversal.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#56)

Total hops the traversal performs, counting the seed lookup as hop 1.
`1` = seed only (identical to the single-hop lane). PR5 default is `2` (one
expansion beyond the seed). Overridable per-call for ablation. Still gated to
the `high` budget in recall, and capped back to 1 on large vaults by
[capHopsForDensity](../functions/capHopsForDensity.md).
