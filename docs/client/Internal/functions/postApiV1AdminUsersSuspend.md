# postApiV1AdminUsersSuspend

> **postApiV1AdminUsersSuspend**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersSuspendData`](../type-aliases/PostApiV1AdminUsersSuspendData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminUsersSuspendResponses`](../type-aliases/PostApiV1AdminUsersSuspendResponses.md), [`PostApiV1AdminUsersSuspendErrors`](../type-aliases/PostApiV1AdminUsersSuspendErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:431](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#431)

Suspend a user account

Suspends (bans) a user account by setting its fraud flag to "suspended" and deactivating all of the user's API keys so programmatic access stops immediately. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersSuspendData`](../type-aliases/PostApiV1AdminUsersSuspendData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminUsersSuspendResponses`](../type-aliases/PostApiV1AdminUsersSuspendResponses.md), [`PostApiV1AdminUsersSuspendErrors`](../type-aliases/PostApiV1AdminUsersSuspendErrors.md), `ThrowOnError`>
