# getConnectorsByProviderConnect

> **getConnectorsByProviderConnect**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetConnectorsByProviderConnectData`](../type-aliases/GetConnectorsByProviderConnectData.md), `ThrowOnError`>): `RequestResult`<`unknown`, [`GetConnectorsByProviderConnectErrors`](../type-aliases/GetConnectorsByProviderConnectErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:2123](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#2123)

Begin upstream OAuth connect flow

Redirects the browser to the upstream OAuth /authorize endpoint for the given connector provider, using a connect-ticket as the auth carrier. Step-up vs initial connect is detected from existing connector\_credentials state.

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

[`Options`](../type-aliases/Options.md)<[`GetConnectorsByProviderConnectData`](../type-aliases/GetConnectorsByProviderConnectData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<`unknown`, [`GetConnectorsByProviderConnectErrors`](../type-aliases/GetConnectorsByProviderConnectErrors.md), `ThrowOnError`>
