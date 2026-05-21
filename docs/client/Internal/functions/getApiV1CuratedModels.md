# getApiV1CuratedModels

> **getApiV1CuratedModels**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1CuratedModelsData`](../type-aliases/GetApiV1CuratedModelsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1CuratedModelsResponses`](../type-aliases/GetApiV1CuratedModelsResponses.md), `unknown`, `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:724](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#724)

List curated models

Returns the product-curated catalog of models with display metadata (name, description, provider, price tier, quality, privacy flag, tier gate). Replaces the hardcoded list previously maintained in the web/mobile clients. Public, no auth required.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1CuratedModelsData`](../type-aliases/GetApiV1CuratedModelsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1CuratedModelsResponses`](../type-aliases/GetApiV1CuratedModelsResponses.md), `unknown`, `ThrowOnError`>
