# postApiV1GuestChatCompletions

> **postApiV1GuestChatCompletions**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1GuestChatCompletionsData`](../type-aliases/PostApiV1GuestChatCompletionsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1GuestChatCompletionsResponses`](../type-aliases/PostApiV1GuestChatCompletionsResponses.md), [`PostApiV1GuestChatCompletionsErrors`](../type-aliases/PostApiV1GuestChatCompletionsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1020](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1020)

Guest chat completion (free trial)

Unauthenticated chat completion locked to a single model with a per-guest message cap. Each guest UUID gets a fixed number of free messages; subsequent requests return 402 with a sign-up prompt.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1GuestChatCompletionsData`](../type-aliases/PostApiV1GuestChatCompletionsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1GuestChatCompletionsResponses`](../type-aliases/PostApiV1GuestChatCompletionsResponses.md), [`PostApiV1GuestChatCompletionsErrors`](../type-aliases/PostApiV1GuestChatCompletionsErrors.md), `ThrowOnError`>
