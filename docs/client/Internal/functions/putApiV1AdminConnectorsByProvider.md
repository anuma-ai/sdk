# putApiV1AdminConnectorsByProvider

> **putApiV1AdminConnectorsByProvider**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PutApiV1AdminConnectorsByProviderData`](../type-aliases/PutApiV1AdminConnectorsByProviderData.md), `ThrowOnError`>): `RequestResult`<[`PutApiV1AdminConnectorsByProviderResponses`](../type-aliases/PutApiV1AdminConnectorsByProviderResponses.md), [`PutApiV1AdminConnectorsByProviderErrors`](../type-aliases/PutApiV1AdminConnectorsByProviderErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:310](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#310)

Enable or disable a connector (admin)

Sets the kill-switch state for one logical connector. Disabling blocks new connects and stops the vault from minting new tokens; already-issued ~5min tokens expire on their own and the upstream refresh token is untouched, so re-enabling needs no reconnect. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PutApiV1AdminConnectorsByProviderData`](../type-aliases/PutApiV1AdminConnectorsByProviderData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PutApiV1AdminConnectorsByProviderResponses`](../type-aliases/PutApiV1AdminConnectorsByProviderResponses.md), [`PutApiV1AdminConnectorsByProviderErrors`](../type-aliases/PutApiV1AdminConnectorsByProviderErrors.md), `ThrowOnError`>
