# createWeatherPreProcessor

> **createWeatherPreProcessor**(`options`: [`WeatherPreProcessorOptions`](../interfaces/WeatherPreProcessorOptions.md)): [`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)

Defined in: [src/lib/chat/weatherClassifier.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#114)

Build a pre-processor that runs weather classification on the shared
embedding provided by `runToolLoop`, and — if the classifier decides
the prompt is asking for weather — invokes the caller-supplied
`fetchWeatherData` and injects the result into the conversation.

The SDK does not run the weather lookup itself; the caller wires up
whichever provider they want (OpenMeteo, AccuWeather, weather.gov, etc.).

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

[`WeatherPreProcessorOptions`](../interfaces/WeatherPreProcessorOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)
