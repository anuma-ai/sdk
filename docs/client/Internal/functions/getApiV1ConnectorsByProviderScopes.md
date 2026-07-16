# getApiV1ConnectorsByProviderScopes

> **getApiV1ConnectorsByProviderScopes**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1ConnectorsByProviderScopesData`](../type-aliases/GetApiV1ConnectorsByProviderScopesData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1ConnectorsByProviderScopesResponses`](../type-aliases/GetApiV1ConnectorsByProviderScopesResponses.md), [`GetApiV1ConnectorsByProviderScopesErrors`](../type-aliases/GetApiV1ConnectorsByProviderScopesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:940](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#940)

Capability catalog + Allow/Disable state for a connector

Returns every capability (access level) the provider exposes with its upstream scopes, a server-owned label, whether the user's credential currently grants it, and the user's Allow/Disable policy (missing row → enabled). connected reflects an active credential row.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1ConnectorsByProviderScopesData`](../type-aliases/GetApiV1ConnectorsByProviderScopesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1ConnectorsByProviderScopesResponses`](../type-aliases/GetApiV1ConnectorsByProviderScopesResponses.md), [`GetApiV1ConnectorsByProviderScopesErrors`](../type-aliases/GetApiV1ConnectorsByProviderScopesErrors.md), `ThrowOnError`>
