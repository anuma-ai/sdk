# postInternalComplete

> **postInternalComplete**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalCompleteData`](../type-aliases/PostInternalCompleteData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalCompleteResponses`](../type-aliases/PostInternalCompleteResponses.md), [`PostInternalCompleteErrors`](../type-aliases/PostInternalCompleteErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1693](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1693)

Create a chat completion (internal)

Internal service-to-service endpoint used by the nearby service to generate short completions without the user credit gate. Model is pinned server-side to an open-weights model and max\_completion\_tokens is clamped. Forwards raw to the gateway; no balance hold, settlement, or moderation — the caller must moderate output it displays. Non-streaming. Gated behind the shared X-Service-Key.

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

[`Options`](../type-aliases/Options.md)<[`PostInternalCompleteData`](../type-aliases/PostInternalCompleteData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalCompleteResponses`](../type-aliases/PostInternalCompleteResponses.md), [`PostInternalCompleteErrors`](../type-aliases/PostInternalCompleteErrors.md), `ThrowOnError`>
