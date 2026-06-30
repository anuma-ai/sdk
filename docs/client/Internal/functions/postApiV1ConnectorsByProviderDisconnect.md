# postApiV1ConnectorsByProviderDisconnect

> **postApiV1ConnectorsByProviderDisconnect**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorsByProviderDisconnectData`](../type-aliases/PostApiV1ConnectorsByProviderDisconnectData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ConnectorsByProviderDisconnectResponses`](../type-aliases/PostApiV1ConnectorsByProviderDisconnectResponses.md), [`PostApiV1ConnectorsByProviderDisconnectErrors`](../type-aliases/PostApiV1ConnectorsByProviderDisconnectErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:860](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#860)

Disconnect a connector

Marks the local credential as user-revoked and purges the in-process token cache. For most providers it also revokes the upstream refresh token (best-effort); shared-consent providers (Google's gmail/gdrive/gcalendar share one consent screen) revoke locally only, since an upstream /revoke would cascade and disconnect the sibling connectors. Returns 200 even if any upstream revoke fails — the local revoke is the source of truth.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorsByProviderDisconnectData`](../type-aliases/PostApiV1ConnectorsByProviderDisconnectData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ConnectorsByProviderDisconnectResponses`](../type-aliases/PostApiV1ConnectorsByProviderDisconnectResponses.md), [`PostApiV1ConnectorsByProviderDisconnectErrors`](../type-aliases/PostApiV1ConnectorsByProviderDisconnectErrors.md), `ThrowOnError`>
