# postApiV1ConnectorsImport

> **postApiV1ConnectorsImport**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorsImportData`](../type-aliases/PostApiV1ConnectorsImportData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ConnectorsImportResponses`](../type-aliases/PostApiV1ConnectorsImportResponses.md), [`PostApiV1ConnectorsImportErrors`](../type-aliases/PostApiV1ConnectorsImportErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:906](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#906)

Import a browser-resident refresh token into the vault

Silent-migration entry point for users with existing browser-resident OAuth tokens. The portal verifies the refresh token against the upstream provider (capturing any rotation) and persists it in connector\_credentials only if no active row exists. Invalid tokens return 400 invalid\_grant; the client should clear localStorage and prompt the user to reconnect.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorsImportData`](../type-aliases/PostApiV1ConnectorsImportData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ConnectorsImportResponses`](../type-aliases/PostApiV1ConnectorsImportResponses.md), [`PostApiV1ConnectorsImportErrors`](../type-aliases/PostApiV1ConnectorsImportErrors.md), `ThrowOnError`>
