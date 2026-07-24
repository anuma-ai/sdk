# getApiV1UsageByModality

> **getApiV1UsageByModality**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1UsageByModalityData`](../type-aliases/GetApiV1UsageByModalityData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetApiV1UsageByModalityResponses`](../type-aliases/GetApiV1UsageByModalityResponses.md), [`GetApiV1UsageByModalityErrors`](../type-aliases/GetApiV1UsageByModalityErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1326](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1326)

Get usage by modality

Returns usage grouped into the four user-facing modality buckets (text, image, video, audio) for the authenticated user within a time period. Tool spend is attributed to the bucket of the calling model. Unknown models default to text.

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

`options?`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`GetApiV1UsageByModalityData`](../type-aliases/GetApiV1UsageByModalityData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1UsageByModalityResponses`](../type-aliases/GetApiV1UsageByModalityResponses.md), [`GetApiV1UsageByModalityErrors`](../type-aliases/GetApiV1UsageByModalityErrors.md), `ThrowOnError`>
