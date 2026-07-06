# deleteApiV1UserOauthGrantsById

> **deleteApiV1UserOauthGrantsById**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`DeleteApiV1UserOauthGrantsByIdData`](../type-aliases/DeleteApiV1UserOauthGrantsByIdData.md), `ThrowOnError`>): `RequestResult`<[`DeleteApiV1UserOauthGrantsByIdResponses`](../type-aliases/DeleteApiV1UserOauthGrantsByIdResponses.md), [`DeleteApiV1UserOauthGrantsByIdErrors`](../type-aliases/DeleteApiV1UserOauthGrantsByIdErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1795](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1795)

Revoke OAuth grant

Revokes an OAuth grant owned by the authenticated user, disabling the associated agent's access.

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

[`Options`](../type-aliases/Options.md)<[`DeleteApiV1UserOauthGrantsByIdData`](../type-aliases/DeleteApiV1UserOauthGrantsByIdData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`DeleteApiV1UserOauthGrantsByIdResponses`](../type-aliases/DeleteApiV1UserOauthGrantsByIdResponses.md), [`DeleteApiV1UserOauthGrantsByIdErrors`](../type-aliases/DeleteApiV1UserOauthGrantsByIdErrors.md), `ThrowOnError`>
