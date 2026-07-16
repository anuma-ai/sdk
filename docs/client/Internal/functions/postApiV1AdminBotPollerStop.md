# postApiV1AdminBotPollerStop

> **postApiV1AdminBotPollerStop**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminBotPollerStopData`](../type-aliases/PostApiV1AdminBotPollerStopData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminBotPollerStopResponses`](../type-aliases/PostApiV1AdminBotPollerStopResponses.md), [`PostApiV1AdminBotPollerStopErrors`](../type-aliases/PostApiV1AdminBotPollerStopErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#274)

Stop the X-bot poller (admin)

Proxies a poller-stop request to the bot worker. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminBotPollerStopData`](../type-aliases/PostApiV1AdminBotPollerStopData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminBotPollerStopResponses`](../type-aliases/PostApiV1AdminBotPollerStopResponses.md), [`PostApiV1AdminBotPollerStopErrors`](../type-aliases/PostApiV1AdminBotPollerStopErrors.md), `ThrowOnError`>
