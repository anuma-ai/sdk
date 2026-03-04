# postApiV1Responses

> **postApiV1Responses**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ResponsesData`](../type-aliases/PostApiV1ResponsesData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ResponsesResponses`](../type-aliases/PostApiV1ResponsesResponses.md), [`PostApiV1ResponsesErrors`](../type-aliases/PostApiV1ResponsesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:586](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#586)

Create response

Generates a response using the Responses API format. Supports streaming when stream=true.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ResponsesData`](../type-aliases/PostApiV1ResponsesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ResponsesResponses`](../type-aliases/PostApiV1ResponsesResponses.md), [`PostApiV1ResponsesErrors`](../type-aliases/PostApiV1ResponsesErrors.md), `ThrowOnError`>
