# getApiV1AdminAppsByAppIdApiKeys

> **getApiV1AdminAppsByAppIdApiKeys**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminAppsByAppIdApiKeysData`](../type-aliases/GetApiV1AdminAppsByAppIdApiKeysData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminAppsByAppIdApiKeysResponses`](../type-aliases/GetApiV1AdminAppsByAppIdApiKeysResponses.md), [`GetApiV1AdminAppsByAppIdApiKeysErrors`](../type-aliases/GetApiV1AdminAppsByAppIdApiKeysErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#70)

List API keys for an app

Returns all API keys for the specified app. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminAppsByAppIdApiKeysData`](../type-aliases/GetApiV1AdminAppsByAppIdApiKeysData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminAppsByAppIdApiKeysResponses`](../type-aliases/GetApiV1AdminAppsByAppIdApiKeysResponses.md), [`GetApiV1AdminAppsByAppIdApiKeysErrors`](../type-aliases/GetApiV1AdminAppsByAppIdApiKeysErrors.md), `ThrowOnError`>
