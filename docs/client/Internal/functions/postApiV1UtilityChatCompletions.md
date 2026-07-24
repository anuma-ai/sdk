# postApiV1UtilityChatCompletions

> **postApiV1UtilityChatCompletions**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1UtilityChatCompletionsData`](../type-aliases/PostApiV1UtilityChatCompletionsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1UtilityChatCompletionsResponses`](../type-aliases/PostApiV1UtilityChatCompletionsResponses.md), [`PostApiV1UtilityChatCompletionsErrors`](../type-aliases/PostApiV1UtilityChatCompletionsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1436](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1436)

Utility chat completions (internal)

Internal-only chat completions with a server-side price-ceiling clamp and no freeloader detector. Same contract as /chat/completions.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1UtilityChatCompletionsData`](../type-aliases/PostApiV1UtilityChatCompletionsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1UtilityChatCompletionsResponses`](../type-aliases/PostApiV1UtilityChatCompletionsResponses.md), [`PostApiV1UtilityChatCompletionsErrors`](../type-aliases/PostApiV1UtilityChatCompletionsErrors.md), `ThrowOnError`>
