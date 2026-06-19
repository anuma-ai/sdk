# getOauthAuthorize

> **getOauthAuthorize**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetOauthAuthorizeData`](../type-aliases/GetOauthAuthorizeData.md), `ThrowOnError`>): `RequestResult`<`unknown`, [`GetOauthAuthorizeErrors`](../type-aliases/GetOauthAuthorizeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1935](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1935)

OAuth 2.0 authorization endpoint

Starts the OAuth 2.0 authorization code flow. Requires the user to be authenticated via Privy JWT. When the requested scopes fit an existing grant, auto-issues a code; otherwise 302s back with error=access\_denied (consent UI lands in PR #2).

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

[`Options`](../type-aliases/Options.md)<[`GetOauthAuthorizeData`](../type-aliases/GetOauthAuthorizeData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<`unknown`, [`GetOauthAuthorizeErrors`](../type-aliases/GetOauthAuthorizeErrors.md), `ThrowOnError`>
