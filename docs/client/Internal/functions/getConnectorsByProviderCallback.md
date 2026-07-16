# getConnectorsByProviderCallback

> **getConnectorsByProviderCallback**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetConnectorsByProviderCallbackData`](../type-aliases/GetConnectorsByProviderCallbackData.md), `ThrowOnError`>): `RequestResult`<`unknown`, [`GetConnectorsByProviderCallbackErrors`](../type-aliases/GetConnectorsByProviderCallbackErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:2085](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#2085)

Upstream OAuth callback

Receives the authorization code from the upstream provider, atomically consumes the connect ticket, exchanges the code for tokens, and persists the encrypted refresh token. Redirects the browser back to ticket.return\_to.

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

[`Options`](../type-aliases/Options.md)<[`GetConnectorsByProviderCallbackData`](../type-aliases/GetConnectorsByProviderCallbackData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<`unknown`, [`GetConnectorsByProviderCallbackErrors`](../type-aliases/GetConnectorsByProviderCallbackErrors.md), `ThrowOnError`>
