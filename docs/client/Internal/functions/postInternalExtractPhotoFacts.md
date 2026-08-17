# postInternalExtractPhotoFacts

> **postInternalExtractPhotoFacts**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalExtractPhotoFactsData`](../type-aliases/PostInternalExtractPhotoFactsData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalExtractPhotoFactsResponses`](../type-aliases/PostInternalExtractPhotoFactsResponses.md), [`PostInternalExtractPhotoFactsErrors`](../type-aliases/PostInternalExtractPhotoFactsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1728](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1728)

Extract user facts from a photo (internal)

Internal service-to-service endpoint used by the nearby service to turn one photo into durable facts about the user. Takes a public image URL plus an optional caption (grounding context, treated as untrusted data). The prompt, vision model, output bounds and sampling parameters are pinned server-side; no credit gate, no moderation (the caller must moderate the photo and the returned text before displaying it). Returns an ordered, de-duplicated, bounded list of fact strings, the sha of the prompt used, and usage. Gated behind the shared X-Service-Key.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ThrowOnError` *extends* `boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

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

[`Options`](../type-aliases/Options.md)<[`PostInternalExtractPhotoFactsData`](../type-aliases/PostInternalExtractPhotoFactsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalExtractPhotoFactsResponses`](../type-aliases/PostInternalExtractPhotoFactsResponses.md), [`PostInternalExtractPhotoFactsErrors`](../type-aliases/PostInternalExtractPhotoFactsErrors.md), `ThrowOnError`>
