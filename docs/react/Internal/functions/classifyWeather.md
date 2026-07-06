# classifyWeather

> **classifyWeather**(`prompt`: `string`, `options`: `WeatherClassifierOptions`): `Promise`<[`WeatherClassification`](../interfaces/WeatherClassification.md)>

Defined in: [src/lib/chat/weatherClassifier.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#58)

Classify whether a prompt needs weather data.

Covers forecasts, temperature, precipitation, wind, humidity, UV, AQI,
marine, flood, climate — anything OpenMeteo-shaped.

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

`prompt`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`WeatherClassifierOptions`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`WeatherClassification`](../interfaces/WeatherClassification.md)>
