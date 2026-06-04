# wrapAsUserText

> **wrapAsUserText**(`prefix`: `string`, `text`: `string`): [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/chat/preProcessor.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#102)

Wrap a pre-processor's fetch-result string in a single `LlmapiMessage`
with the given prefix. Used by the built-in pre-processor factories
(web-search, crypto-price, stock-price, weather) to keep the message
shape consistent. Returns an empty array if `text` is empty or
whitespace-only — callers can spread it into a result or return it
directly and the tool loop will treat it as "no injection".

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

`prefix`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`text`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]
