# postInternalEmbeddings

> **postInternalEmbeddings**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalEmbeddingsData`](../type-aliases/PostInternalEmbeddingsData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalEmbeddingsResponses`](../type-aliases/PostInternalEmbeddingsResponses.md), [`PostInternalEmbeddingsErrors`](../type-aliases/PostInternalEmbeddingsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1571](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1571)

Create embeddings (internal)

Internal service-to-service endpoint used by the nearby service to generate embeddings without the user credit gate. Forwards raw to the gateway; no balance hold, settlement, or moderation. Gated behind the shared X-Service-Key.

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

[`Options`](../type-aliases/Options.md)<[`PostInternalEmbeddingsData`](../type-aliases/PostInternalEmbeddingsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalEmbeddingsResponses`](../type-aliases/PostInternalEmbeddingsResponses.md), [`PostInternalEmbeddingsErrors`](../type-aliases/PostInternalEmbeddingsErrors.md), `ThrowOnError`>
