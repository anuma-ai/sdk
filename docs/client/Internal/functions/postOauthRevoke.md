# postOauthRevoke

> **postOauthRevoke**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostOauthRevokeData`](../type-aliases/PostOauthRevokeData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`PostOauthRevokeResponses`](../type-aliases/PostOauthRevokeResponses.md), [`PostOauthRevokeErrors`](../type-aliases/PostOauthRevokeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1586](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1586)

OAuth 2.0 token revocation (RFC 7009)

Revokes a refresh token, or (with token\_type\_hint=grant) the entire grant. Always returns 200 per RFC 7009 when the client is authenticated.

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

[`Options`](../type-aliases/Options.md)<[`PostOauthRevokeData`](../type-aliases/PostOauthRevokeData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostOauthRevokeResponses`](../type-aliases/PostOauthRevokeResponses.md), [`PostOauthRevokeErrors`](../type-aliases/PostOauthRevokeErrors.md), `ThrowOnError`>
