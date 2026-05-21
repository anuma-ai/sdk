# postApiV1UserApiKeys

> **postApiV1UserApiKeys**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1UserApiKeysData`](../type-aliases/PostApiV1UserApiKeysData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1UserApiKeysResponses`](../type-aliases/PostApiV1UserApiKeysResponses.md), [`PostApiV1UserApiKeysErrors`](../type-aliases/PostApiV1UserApiKeysErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1119](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1119)

Create user API key

Creates a new API key for the authenticated user, scoped to the app they are authenticated against. The full key is only shown once. Requires JWT authentication (API key auth is not allowed).

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1UserApiKeysData`](../type-aliases/PostApiV1UserApiKeysData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1UserApiKeysResponses`](../type-aliases/PostApiV1UserApiKeysResponses.md), [`PostApiV1UserApiKeysErrors`](../type-aliases/PostApiV1UserApiKeysErrors.md), `ThrowOnError`>
