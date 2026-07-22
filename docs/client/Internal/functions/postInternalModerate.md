# postInternalModerate

> **postInternalModerate**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalModerateData`](../type-aliases/PostInternalModerateData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalModerateResponses`](../type-aliases/PostInternalModerateResponses.md), [`PostInternalModerateErrors`](../type-aliases/PostInternalModerateErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:2175](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#2175)

Moderate content (internal)

Internal service-to-service endpoint used by the nearby service to scan texts and image URLs with the content-moderation model. Reuses the in-process Moderator (same thresholds as the chat path), applies no credit gate, and fails closed on backend errors. Gated behind the shared X-Service-Key.

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

[`Options`](../type-aliases/Options.md)<[`PostInternalModerateData`](../type-aliases/PostInternalModerateData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalModerateResponses`](../type-aliases/PostInternalModerateResponses.md), [`PostInternalModerateErrors`](../type-aliases/PostInternalModerateErrors.md), `ThrowOnError`>
