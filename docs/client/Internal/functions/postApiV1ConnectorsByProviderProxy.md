# postApiV1ConnectorsByProviderProxy

> **postApiV1ConnectorsByProviderProxy**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorsByProviderProxyData`](../type-aliases/PostApiV1ConnectorsByProviderProxyData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ConnectorsByProviderProxyResponses`](../type-aliases/PostApiV1ConnectorsByProviderProxyResponses.md), [`PostApiV1ConnectorsByProviderProxyErrors`](../type-aliases/PostApiV1ConnectorsByProviderProxyErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:872](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#872)

Proxy a read-only connector API call

Forwards a GET request to a connector's upstream API server-side, minting the user's connector token internally. Some upstreams (X, Slack) send no CORS headers, so the browser cannot call them directly. The provider comes from the path and must have a proxy policy; the request path is restricted to a strict per-provider allowlist. The upstream status code and JSON body are returned verbatim. Mint failures carry the same structured envelope as the mint endpoint: 412 connector\_not\_connected/scope\_not\_covered/invalid\_grant include a connect\_url.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorsByProviderProxyData`](../type-aliases/PostApiV1ConnectorsByProviderProxyData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ConnectorsByProviderProxyResponses`](../type-aliases/PostApiV1ConnectorsByProviderProxyResponses.md), [`PostApiV1ConnectorsByProviderProxyErrors`](../type-aliases/PostApiV1ConnectorsByProviderProxyErrors.md), `ThrowOnError`>
