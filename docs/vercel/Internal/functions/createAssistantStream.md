# createAssistantStream

> **createAssistantStream**(`text`: `string`): `ReadableStream`<`AssistantStreamEvent`>

Defined in: src/vercel/streams.ts:18

Creates a `ReadableStream` that emits the sequence of events expected by
Vercel's `createUIMessageStreamResponse` helper for a successful assistant reply.

The stream emits `text-start`, an optional `text-delta` containing the
provided `text`, and finally `text-end`, allowing Portal completions to be
piped directly into UI components that consume the AI SDK stream contract.

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

`text`

</td>
<td>

`string`

</td>
<td>

The assistant response text returned by the Portal API.

</td>
</tr>
</tbody>
</table>

## Returns

`ReadableStream`<`AssistantStreamEvent`>

A stream ready to be passed to `createUIMessageStreamResponse`.
