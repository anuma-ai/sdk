# extractFacts

> **extractFacts**(`messages`: [`AutoExtractMessage`](../interfaces/AutoExtractMessage.md)\[], `options`: [`ExtractFactsOptions`](../interfaces/ExtractFactsOptions.md)): `Promise`<[`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]>

Defined in: [src/lib/memory/autoExtract.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#214)

Stage 1 — call the LLM to extract candidate facts from the recent
conversation. Returns post-validated candidates only (confidence
threshold, source-id check, length cap, schema validation). Returns
an empty array if the LLM emits malformed JSON or no candidates.

A null from `callPortalJsonCompletion` means a *failure* (empty completion,
malformed JSON, network/HTTP error) — distinct from a successful
`{candidates: []}`, which parses to a non-null object. A failed extraction
silently drops the whole turn's memories, so transient failures matter:
`callPortalJsonCompletion` retries them internally with backoff (default 3
attempts), so a one-off empty/malformed completion from a reasoning-class
model doesn't lose the turn. Only an exhausted-retry null reaches here.

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

`messages`

</td>
<td>

[`AutoExtractMessage`](../interfaces/AutoExtractMessage.md)\[]

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`ExtractFactsOptions`](../interfaces/ExtractFactsOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]>
