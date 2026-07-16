# postApiV1AdminUsersUnsuspend

> **postApiV1AdminUsersUnsuspend**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersUnsuspendData`](../type-aliases/PostApiV1AdminUsersUnsuspendData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminUsersUnsuspendResponses`](../type-aliases/PostApiV1AdminUsersUnsuspendResponses.md), [`PostApiV1AdminUsersUnsuspendErrors`](../type-aliases/PostApiV1AdminUsersUnsuspendErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:588](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#588)

Unsuspend a user account

Lifts a suspension on a user account by resetting its fraud flag to "none". API keys deactivated during suspension are NOT automatically reactivated. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersUnsuspendData`](../type-aliases/PostApiV1AdminUsersUnsuspendData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminUsersUnsuspendResponses`](../type-aliases/PostApiV1AdminUsersUnsuspendResponses.md), [`PostApiV1AdminUsersUnsuspendErrors`](../type-aliases/PostApiV1AdminUsersUnsuspendErrors.md), `ThrowOnError`>
