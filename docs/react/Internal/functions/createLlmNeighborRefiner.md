# createLlmNeighborRefiner

> **createLlmNeighborRefiner**(`options`: [`LlmNeighborRefinerOptions`](../interfaces/LlmNeighborRefinerOptions.md)): [`NeighborRefiner`](../interfaces/NeighborRefiner.md)

Defined in: [src/lib/memory/graphTraversal.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#317)

Build a [NeighborRefiner](../interfaces/NeighborRefiner.md) backed by a cheap portal LLM. At each hop it
asks the model to pick, from the candidate neighbor entities, the ≤`limit`
most relevant to the query, so traversal expands toward the question instead
of purely by co-occurrence frequency.

Bounded + fail-safe: one attempt by default, a short total timeout, and
[traverseGraphLane](traverseGraphLane.md) falls back to the deterministic co-occurrence order
on any throw or empty result — so enabling this can reorder which neighbors
expand but never breaks or stalls recall.

ZERO-KNOWLEDGE NOTE: this sends the query + candidate ENTITY NAMES (not
memory content) to the portal. Entity names are lower-cardinality than
content but are still user data derived from the stored graph; it is opt-in
(default off in recall) and reuses the same auth the query-decompose step
already uses. A security review should weigh entity-name exposure before
enabling it broadly.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

[`LlmNeighborRefinerOptions`](../interfaces/LlmNeighborRefinerOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`NeighborRefiner`](../interfaces/NeighborRefiner.md)
