# getApiV1UserOauthGrants

> **getApiV1UserOauthGrants**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1UserOauthGrantsData`](../type-aliases/GetApiV1UserOauthGrantsData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetApiV1UserOauthGrantsResponses`](../type-aliases/GetApiV1UserOauthGrantsResponses.md), [`GetApiV1UserOauthGrantsErrors`](../type-aliases/GetApiV1UserOauthGrantsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1408](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1408)

List user OAuth grants

Returns all OAuth grants (active and revoked) for the authenticated user, including today's daily spend.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1UserOauthGrantsData`](../type-aliases/GetApiV1UserOauthGrantsData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1UserOauthGrantsResponses`](../type-aliases/GetApiV1UserOauthGrantsResponses.md), [`GetApiV1UserOauthGrantsErrors`](../type-aliases/GetApiV1UserOauthGrantsErrors.md), `ThrowOnError`>
