# getApiV1UsageModels

> **getApiV1UsageModels**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1UsageModelsData`](../type-aliases/GetApiV1UsageModelsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1UsageModelsResponses`](../type-aliases/GetApiV1UsageModelsResponses.md), [`GetApiV1UsageModelsErrors`](../type-aliases/GetApiV1UsageModelsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1095](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1095)

Get usage by model

Returns per-model usage (spend, requests, tokens) and tool usage grouped by model for the authenticated user within a time period.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1UsageModelsData`](../type-aliases/GetApiV1UsageModelsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1UsageModelsResponses`](../type-aliases/GetApiV1UsageModelsResponses.md), [`GetApiV1UsageModelsErrors`](../type-aliases/GetApiV1UsageModelsErrors.md), `ThrowOnError`>
