# createErrorStream

> **createErrorStream**(`errorText`: `string`): `ReadableStream`<`AssistantStreamEvent`>

Defined in: [src/vercel/streams.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/vercel/streams.ts#L54)

Creates a `ReadableStream` that emits a single `error` event compatible
with the Vercel AI stream contract. This allows Portal API errors to be
surfaced directly in UI components that expect streamed assistant output.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`errorText`

</td>
<td>

`string`

</td>
<td>

A human-readable error message to display in the UI.

</td>
</tr>
</tbody>
</table>

## Returns

`ReadableStream`<`AssistantStreamEvent`>

A stream that, when consumed, immediately emits the error event.
