# postOauthToken

> **postOauthToken**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostOauthTokenData`](../type-aliases/PostOauthTokenData.md), `ThrowOnError`>): `RequestResult`<[`PostOauthTokenResponses`](../type-aliases/PostOauthTokenResponses.md), [`PostOauthTokenErrors`](../type-aliases/PostOauthTokenErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:2201](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#2201)

OAuth 2.0 token endpoint

Exchanges an authorization code or rotates a refresh token for a new access+refresh pair.

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

[`Options`](../type-aliases/Options.md)<[`PostOauthTokenData`](../type-aliases/PostOauthTokenData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostOauthTokenResponses`](../type-aliases/PostOauthTokenResponses.md), [`PostOauthTokenErrors`](../type-aliases/PostOauthTokenErrors.md), `ThrowOnError`>
