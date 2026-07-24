# postApiV1Moderate

> **postApiV1Moderate**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ModerateData`](../type-aliases/PostApiV1ModerateData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ModerateResponses`](../type-aliases/PostApiV1ModerateResponses.md), [`PostApiV1ModerateErrors`](../type-aliases/PostApiV1ModerateErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1025](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1025)

Moderate content

Scans the supplied texts with the content-moderation model and returns the threshold-applied verdict (flagged, crossed categories, raw scores). Intended as a server-side output-safety gate for machine callers.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ModerateData`](../type-aliases/PostApiV1ModerateData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ModerateResponses`](../type-aliases/PostApiV1ModerateResponses.md), [`PostApiV1ModerateErrors`](../type-aliases/PostApiV1ModerateErrors.md), `ThrowOnError`>
