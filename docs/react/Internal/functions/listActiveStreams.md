# listActiveStreams

> **listActiveStreams**(`options`: `object`): `Promise`<[`ActiveStream`](../type-aliases/ActiveStream.md)\[]>

Defined in: [src/lib/chat/resumeStream.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#76)

List the caller's generations still running on the portal.

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

`object`

</td>
</tr>
<tr>
<td>

`options.baseUrl?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options.conversationId?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options.fetch?`

</td>
<td>

{(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

</td>
</tr>
<tr>
<td>

`options.token`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ActiveStream`](../type-aliases/ActiveStream.md)\[]>
