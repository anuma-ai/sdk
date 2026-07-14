# MAX\_HOPS

> `const` **MAX\_HOPS**: `1` = `1`

Defined in: src/lib/memory/graphTraversal.ts:46

Total hops the traversal performs, counting the seed lookup as hop 1.
`1` = seed only (identical to the single-hop lane). PR4 default; PR5
raises the default to `2` (one expansion). Overridable per-call for
ablation.
