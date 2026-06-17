# getApiV1ChatStreamsByInferenceId

> **getApiV1ChatStreamsByInferenceId**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1ChatStreamsByInferenceIdData`](../type-aliases/GetApiV1ChatStreamsByInferenceIdData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1ChatStreamsByInferenceIdResponses`](../type-aliases/GetApiV1ChatStreamsByInferenceIdResponses.md), [`GetApiV1ChatStreamsByInferenceIdErrors`](../type-aliases/GetApiV1ChatStreamsByInferenceIdErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:732](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#732)

Resume (replay + tail) a buffered chat stream

Replays the buffered SSE prefix of an interrupted chat stream from the Redis buffer, byte-identical to the original wire, then live-tails it to its terminal state. The response is an SSE stream (text/event-stream) terminated by `data: [DONE]`. A non-completed terminal (tool calls awaited, deadline exceeded, generation error, or a cancel raced in during tail) is delivered as an in-stream error event (`code: stream_interrupted`) followed by `[DONE]`; raw tool-request frames are never replayed. Unknown, expired, cancelled, or not-owned ids all return 410 (no existence oracle). Bearer auth; the caller must own the stream.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ThrowOnError` *extends* `boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1ChatStreamsByInferenceIdData`](../type-aliases/GetApiV1ChatStreamsByInferenceIdData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1ChatStreamsByInferenceIdResponses`](../type-aliases/GetApiV1ChatStreamsByInferenceIdResponses.md), [`GetApiV1ChatStreamsByInferenceIdErrors`](../type-aliases/GetApiV1ChatStreamsByInferenceIdErrors.md), `ThrowOnError`>
