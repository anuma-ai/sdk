# getApiV1Models

> **getApiV1Models**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1ModelsData`](../type-aliases/GetApiV1ModelsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:574](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#574)

List available models

Returns a list of all available models from the configured gateway with optional filters. Models include modality information indicating their capabilities (e.g., llm, embedding, vision, image, audio, reasoning, code, reranker, multimodal, video).

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1ModelsData`](../type-aliases/GetApiV1ModelsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`>
