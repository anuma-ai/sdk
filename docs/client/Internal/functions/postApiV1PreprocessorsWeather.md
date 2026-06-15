# postApiV1PreprocessorsWeather

> **postApiV1PreprocessorsWeather**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsWeatherData`](../type-aliases/PostApiV1PreprocessorsWeatherData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1PreprocessorsWeatherResponses`](../type-aliases/PostApiV1PreprocessorsWeatherResponses.md), [`PostApiV1PreprocessorsWeatherErrors`](../type-aliases/PostApiV1PreprocessorsWeatherErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1345](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1345)

Get weather

Extracts a location name from the prompt, geocodes it via Open-Meteo, and returns current conditions plus a short daily forecast.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsWeatherData`](../type-aliases/PostApiV1PreprocessorsWeatherData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1PreprocessorsWeatherResponses`](../type-aliases/PostApiV1PreprocessorsWeatherResponses.md), [`PostApiV1PreprocessorsWeatherErrors`](../type-aliases/PostApiV1PreprocessorsWeatherErrors.md), `ThrowOnError`>
