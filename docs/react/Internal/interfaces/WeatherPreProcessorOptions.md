# WeatherPreProcessorOptions

Defined in: [src/lib/chat/weatherClassifier.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#80)

## Properties

### fetchWeatherData()?

> `optional` **fetchWeatherData**: (`prompt`: `string`, `options`: `object`) => `Promise`<`string` | [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]>

Defined in: [src/lib/chat/weatherClassifier.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#91)

Called with the caller's weather provider when the classifier decides
the prompt is asking for weather. Return either a plain string
(wrapped by the SDK in a default user message) or a fully-formed
`LlmapiMessage[]` (full control over role/shape). Omit to run in
observer mode — classification still fires but nothing is injected.

The `signal` argument is forwarded from the tool loop so long-running
provider requests can be aborted when the caller aborts.

**Parameters**

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

`object`

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]>

***

### margin?

> `optional` **margin**: `number`

Defined in: [src/lib/chat/weatherClassifier.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#100)

Score margin: `weatherScore` must exceed `noWeatherScore` by at least
this amount to classify as "needs weather data".

**Default**

```ts
0.02
```

***

### onClassification()?

> `optional` **onClassification**: (`result`: [`WeatherClassification`](WeatherClassification.md)) => `void`

Defined in: [src/lib/chat/weatherClassifier.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#102)

Observe the classification without injecting anything.

**Parameters**

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

`result`

</td>
<td>

[`WeatherClassification`](WeatherClassification.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
