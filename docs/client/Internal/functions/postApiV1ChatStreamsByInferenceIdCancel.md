# postApiV1ChatStreamsByInferenceIdCancel

> **postApiV1ChatStreamsByInferenceIdCancel**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ChatStreamsByInferenceIdCancelData`](../type-aliases/PostApiV1ChatStreamsByInferenceIdCancelData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ChatStreamsByInferenceIdCancelResponses`](../type-aliases/PostApiV1ChatStreamsByInferenceIdCancelResponses.md), [`PostApiV1ChatStreamsByInferenceIdCancelErrors`](../type-aliases/PostApiV1ChatStreamsByInferenceIdCancelErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:744](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#744)

Cancel a buffered chat stream

Cancels an in-flight or detached chat generation identified by its inference ID, from any pod. Writes the first-terminal-wins cancel tombstone, broadcasts a cross-pod cancel, and (on the generating pod) stops generation immediately. Idempotent: a stream already in a terminal state returns `{"status":"noop"}`, distinguishing an explicit cancel from a mere disconnect. Unknown, expired, or not-owned ids return 410 (no existence oracle). Bearer auth; the caller must own the stream. Credits are untouched — the generation goroutine settles partial usage through its existing path.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ChatStreamsByInferenceIdCancelData`](../type-aliases/PostApiV1ChatStreamsByInferenceIdCancelData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ChatStreamsByInferenceIdCancelResponses`](../type-aliases/PostApiV1ChatStreamsByInferenceIdCancelResponses.md), [`PostApiV1ChatStreamsByInferenceIdCancelErrors`](../type-aliases/PostApiV1ChatStreamsByInferenceIdCancelErrors.md), `ThrowOnError`>
