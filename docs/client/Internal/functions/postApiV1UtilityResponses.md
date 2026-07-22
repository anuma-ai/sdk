# postApiV1UtilityResponses

> **postApiV1UtilityResponses**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1UtilityResponsesData`](../type-aliases/PostApiV1UtilityResponsesData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1UtilityResponsesResponses`](../type-aliases/PostApiV1UtilityResponsesResponses.md), [`PostApiV1UtilityResponsesErrors`](../type-aliases/PostApiV1UtilityResponsesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1967](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1967)

Create utility response

Generates a response for internal utility flows using the Responses API format. The request model is clamped server-side to a price ceiling. Supports streaming when stream=true.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1UtilityResponsesData`](../type-aliases/PostApiV1UtilityResponsesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1UtilityResponsesResponses`](../type-aliases/PostApiV1UtilityResponsesResponses.md), [`PostApiV1UtilityResponsesErrors`](../type-aliases/PostApiV1UtilityResponsesErrors.md), `ThrowOnError`>
