# createLlmNeighborRefiner

> **createLlmNeighborRefiner**(`options`: [`LlmNeighborRefinerOptions`](../interfaces/LlmNeighborRefinerOptions.md)): [`NeighborRefiner`](../interfaces/NeighborRefiner.md)

Defined in: [src/lib/memory/graphTraversal.ts:397](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#397)

Build a [NeighborRefiner](../interfaces/NeighborRefiner.md) backed by a cheap portal LLM. At each hop it
asks the model to pick, from the candidate neighbor entities, the ≤`limit`
most relevant to the query, so traversal expands toward the question instead
of purely by co-occurrence frequency.

Bounded + fail-safe: one attempt by default, a short total timeout, and
[traverseGraphLane](traverseGraphLane.md) falls back to the deterministic co-occurrence order
on any throw or empty result — so enabling this can reorder which neighbors
expand but never breaks or stalls recall.

SECURITY / ZERO-KNOWLEDGE (must stay default-OFF): this sends the query +
candidate ENTITY NAMES to the portal UNREDACTED. Those names ARE user PII —
people, places, orgs pulled from the stored graph (e.g. "Sara", "Kyoto",
"Acme") — not lower-risk than content just because they're short. It reuses
the query-decompose auth and is opt-in (`RecallOptions.graphRefine`, default
off in recall); leave it off unless you accept that exposure. To bound that
exposure, [traverseGraphLane](traverseGraphLane.md) caps the candidate list it hands this
refiner per hop — at most `MAX_REFINER_CANDIDATES` entity names ever leave per
hop, REGARDLESS of `entityFanout` (the cap is a hard ceiling, not just a
fanout-scaled floor), so the full frontier is never egressed.

MEDIUM residual: a malicious / MITM'd portal can only steer WHICH neighbor
entities expand — a recall-ranking nudge, not a data-integrity change (no
memory is written, archived, or deleted), and [traverseGraphLane](traverseGraphLane.md)
falls back to deterministic order on any bad/empty response. Bounded tradeoff.

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
