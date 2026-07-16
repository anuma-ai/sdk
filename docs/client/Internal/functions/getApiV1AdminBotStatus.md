# getApiV1AdminBotStatus

> **getApiV1AdminBotStatus**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminBotStatusData`](../type-aliases/GetApiV1AdminBotStatusData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminBotStatusResponses`](../type-aliases/GetApiV1AdminBotStatusResponses.md), [`GetApiV1AdminBotStatusErrors`](../type-aliases/GetApiV1AdminBotStatusErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#286)

Get X-bot status (admin)

Proxies to the bot worker for current config, poller state, and today's spend. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminBotStatusData`](../type-aliases/GetApiV1AdminBotStatusData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminBotStatusResponses`](../type-aliases/GetApiV1AdminBotStatusResponses.md), [`GetApiV1AdminBotStatusErrors`](../type-aliases/GetApiV1AdminBotStatusErrors.md), `ThrowOnError`>
