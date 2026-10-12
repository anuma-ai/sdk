# WebSearchPreProcessorOptions

Defined in: [src/lib/chat/webSearchClassifier.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#66)

## Properties

### fetchSearchResults()?

> `optional` **fetchSearchResults**: (`prompt`: `string`, `options`: `object`) => `Promise`<`string` | [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]>

Defined in: [src/lib/chat/webSearchClassifier.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#77)

Called with the caller's search provider when the classifier decides
a web search is needed. Return either a plain string (the SDK will
wrap it in a default user message) or a fully-formed message array
(full control over role/shape). Omit to run in observer mode —
classification still fires but no messages are injected.

The `signal` argument is forwarded from the tool loop so long-running
search requests can be aborted when the caller aborts.

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

Defined in: [src/lib/chat/webSearchClassifier.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#86)

Score margin: `searchScore` must exceed `noSearchScore` by at least
this amount to classify as "needs web search".

**Default**

```ts
0.02
```

***

### onClassification()?

> `optional` **onClassification**: (`result`: [`WebSearchClassification`](WebSearchClassification.md)) => `void`

Defined in: [src/lib/chat/webSearchClassifier.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#88)

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

[`WebSearchClassification`](WebSearchClassification.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
