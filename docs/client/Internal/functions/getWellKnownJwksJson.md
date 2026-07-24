# getWellKnownJwksJson

> **getWellKnownJwksJson**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetWellKnownJwksJsonData`](../type-aliases/GetWellKnownJwksJsonData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetWellKnownJwksJsonResponses`](../type-aliases/GetWellKnownJwksJsonResponses.md), `unknown`, `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#26)

OAuth 2.0 JSON Web Key Set

Returns the portal's OAuth signing public keys for verifying portal-issued access tokens.

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

[`Options`](../type-aliases/Options.md)<[`GetWellKnownJwksJsonData`](../type-aliases/GetWellKnownJwksJsonData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetWellKnownJwksJsonResponses`](../type-aliases/GetWellKnownJwksJsonResponses.md), `unknown`, `ThrowOnError`>
