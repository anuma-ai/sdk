# getApiV1AdminApps

> **getApiV1AdminApps**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminAppsData`](../type-aliases/GetApiV1AdminAppsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminAppsResponses`](../type-aliases/GetApiV1AdminAppsResponses.md), [`GetApiV1AdminAppsErrors`](../type-aliases/GetApiV1AdminAppsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#42)

List all apps

Returns all registered apps with pagination. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminAppsData`](../type-aliases/GetApiV1AdminAppsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminAppsResponses`](../type-aliases/GetApiV1AdminAppsResponses.md), [`GetApiV1AdminAppsErrors`](../type-aliases/GetApiV1AdminAppsErrors.md), `ThrowOnError`>
