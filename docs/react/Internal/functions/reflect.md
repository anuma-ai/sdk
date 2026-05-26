# reflect

> **reflect**(`query`: `string`, `ctx`: [`RecallContext`](../interfaces/RecallContext.md), `options`: [`ReflectOptions`](../interfaces/ReflectOptions.md)): `Promise`<[`ReflectResult`](../interfaces/ReflectResult.md)>

Defined in: [src/lib/memory/reflect.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#78)

Synthesize a grounded answer to `query` using the user's memory as
evidence. On any LLM failure, returns an empty result with the
recalled memory ids — the caller can decide whether to retry or fall
back to a non-grounded response.

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`ctx`

</td>
<td>

[`RecallContext`](../interfaces/RecallContext.md)

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`ReflectOptions`](../interfaces/ReflectOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ReflectResult`](../interfaces/ReflectResult.md)>
