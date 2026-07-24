# VAULT\_SIZE\_HOP\_CAP

> `const` **VAULT\_SIZE\_HOP\_CAP**: `1000` = `1000`

Defined in: [src/lib/memory/graphTraversal.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#100)

Above this vault size, [capHopsForDensity](../functions/capHopsForDensity.md) forces `MAX_HOPS = 1`
(seed-only). Fan-out grows with graph density, so on large vaults we don't
pay the expansion cost. Bounded-traversal safety valve.
