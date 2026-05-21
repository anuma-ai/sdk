# deleteApiV1Account

> **deleteApiV1Account**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`DeleteApiV1AccountData`](../type-aliases/DeleteApiV1AccountData.md), `ThrowOnError`>): `RequestResult`<[`DeleteApiV1AccountResponses`](../type-aliases/DeleteApiV1AccountResponses.md), [`DeleteApiV1AccountErrors`](../type-aliases/DeleteApiV1AccountErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#26)

Delete the authenticated user's account

Permanently deletes the user's account and all associated data. Cancels any active Stripe subscription.

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

`options?`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`DeleteApiV1AccountData`](../type-aliases/DeleteApiV1AccountData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`DeleteApiV1AccountResponses`](../type-aliases/DeleteApiV1AccountResponses.md), [`DeleteApiV1AccountErrors`](../type-aliases/DeleteApiV1AccountErrors.md), `ThrowOnError`>
