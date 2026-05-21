# deleteApiV1AdminUsersDelete

> **deleteApiV1AdminUsersDelete**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`DeleteApiV1AdminUsersDeleteData`](../type-aliases/DeleteApiV1AdminUsersDeleteData.md), `ThrowOnError`>): `RequestResult`<[`DeleteApiV1AdminUsersDeleteResponses`](../type-aliases/DeleteApiV1AdminUsersDeleteResponses.md), [`DeleteApiV1AdminUsersDeleteErrors`](../type-aliases/DeleteApiV1AdminUsersDeleteErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:420](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#420)

Delete user account (admin)

Permanently deletes a user account and all associated cascading data (enrollments, requests, credit claims, etc.) and best-effort cancels any Stripe subscription. Accepts wallet\_address, phone, telegram, or email (exactly one required). Returns stripe\_cleanup\_succeeded=false when the account was deleted but the Stripe customer cleanup failed — operator must clean up Stripe manually.

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

[`Options`](../type-aliases/Options.md)<[`DeleteApiV1AdminUsersDeleteData`](../type-aliases/DeleteApiV1AdminUsersDeleteData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`DeleteApiV1AdminUsersDeleteResponses`](../type-aliases/DeleteApiV1AdminUsersDeleteResponses.md), [`DeleteApiV1AdminUsersDeleteErrors`](../type-aliases/DeleteApiV1AdminUsersDeleteErrors.md), `ThrowOnError`>
