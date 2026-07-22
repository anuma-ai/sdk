# postApiV1AdminOauthClients

> **postApiV1AdminOauthClients**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminOauthClientsData`](../type-aliases/PostApiV1AdminOauthClientsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminOauthClientsResponses`](../type-aliases/PostApiV1AdminOauthClientsResponses.md), [`PostApiV1AdminOauthClientsErrors`](../type-aliases/PostApiV1AdminOauthClientsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#278)

Create an OAuth client (agent registration)

Registers a new OAuth 2.0 client. Public clients (default) authenticate via PKCE and have no secret. Confidential clients receive a plaintext secret in the response (returned exactly once).

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminOauthClientsData`](../type-aliases/PostApiV1AdminOauthClientsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminOauthClientsResponses`](../type-aliases/PostApiV1AdminOauthClientsResponses.md), [`PostApiV1AdminOauthClientsErrors`](../type-aliases/PostApiV1AdminOauthClientsErrors.md), `ThrowOnError`>
