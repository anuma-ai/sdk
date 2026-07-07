# createStreamingDeAnonymizer

> **createStreamingDeAnonymizer**(`redactor`: [`PiiRedactor`](../classes/PiiRedactor.md), `emit`: (`chunk`: `string`) => `void`): `object`

Defined in: [src/lib/pii/redactor.ts:701](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#701)

Wraps an output sink so a streamed sequence of chunks is de-anonymized
correctly even when a placeholder ("\[EMAIL\_1]") is split across chunk
boundaries — which happens routinely because the stream smoother emits text
a few characters at a time.

Each `push` emits everything that is safe to restore now and holds back any
trailing fragment that could be the start of a placeholder ("\[", optionally
followed by placeholder-body characters) until it completes. Call `flush`
when the stream ends to emit whatever remains.

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

`redactor`

</td>
<td>

[`PiiRedactor`](../classes/PiiRedactor.md)

</td>
</tr>
<tr>
<td>

`emit`

</td>
<td>

(`chunk`: `string`) => `void`

</td>
</tr>
</tbody>
</table>

## Returns

`object`

### flush()

> **flush**: () => `void`

**Returns**

`void`

### push()

> **push**: (`chunk`: `string`) => `void`

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

`chunk`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
