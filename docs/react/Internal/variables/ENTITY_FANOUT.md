# ENTITY\_FANOUT

> `const` **ENTITY\_FANOUT**: `8` = `8`

Defined in: src/lib/memory/graphTraversal.ts:54

Max neighbor entities expanded per hop. Caps fan-out so a densely-linked
frontier can't explode the candidate pool. Neighbors are ranked by
co-occurrence frequency across the frontier; only the top this-many expand.
