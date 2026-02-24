# postApiV1ChatCompletions

> **postApiV1ChatCompletions**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ChatCompletionsData`](../type-aliases/PostApiV1ChatCompletionsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ChatCompletionsResponses`](../type-aliases/PostApiV1ChatCompletionsResponses.md), [`PostApiV1ChatCompletionsErrors`](../type-aliases/PostApiV1ChatCompletionsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#L210)

Create chat completion

Generates a chat completion using the configured gateway. Supports streaming when stream=true.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ChatCompletionsData`](../type-aliases/PostApiV1ChatCompletionsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ChatCompletionsResponses`](../type-aliases/PostApiV1ChatCompletionsResponses.md), [`PostApiV1ChatCompletionsErrors`](../type-aliases/PostApiV1ChatCompletionsErrors.md), `ThrowOnError`>
