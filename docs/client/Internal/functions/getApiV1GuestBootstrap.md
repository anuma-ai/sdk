# getApiV1GuestBootstrap

> **getApiV1GuestBootstrap**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1GuestBootstrapData`](../type-aliases/GetApiV1GuestBootstrapData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1GuestBootstrapResponses`](../type-aliases/GetApiV1GuestBootstrapResponses.md), [`GetApiV1GuestBootstrapErrors`](../type-aliases/GetApiV1GuestBootstrapErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1284](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1284)

Bootstrap guest session

Returns feature-flag assignments and server build metadata for an unauthenticated visitor. The client must generate a UUID v4 on first visit, persist it locally, and send it as X-Guest-ID on every call. Returns 400 if the header is missing or malformed.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1GuestBootstrapData`](../type-aliases/GetApiV1GuestBootstrapData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1GuestBootstrapResponses`](../type-aliases/GetApiV1GuestBootstrapResponses.md), [`GetApiV1GuestBootstrapErrors`](../type-aliases/GetApiV1GuestBootstrapErrors.md), `ThrowOnError`>
