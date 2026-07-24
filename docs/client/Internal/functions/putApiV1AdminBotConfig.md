# putApiV1AdminBotConfig

> **putApiV1AdminBotConfig**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PutApiV1AdminBotConfigData`](../type-aliases/PutApiV1AdminBotConfigData.md), `ThrowOnError`>): `RequestResult`<[`PutApiV1AdminBotConfigResponses`](../type-aliases/PutApiV1AdminBotConfigResponses.md), [`PutApiV1AdminBotConfigErrors`](../type-aliases/PutApiV1AdminBotConfigErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#187)

Update X-bot config (admin)

Proxies a partial BotConfig patch to the bot worker, which merges it. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PutApiV1AdminBotConfigData`](../type-aliases/PutApiV1AdminBotConfigData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PutApiV1AdminBotConfigResponses`](../type-aliases/PutApiV1AdminBotConfigResponses.md), [`PutApiV1AdminBotConfigErrors`](../type-aliases/PutApiV1AdminBotConfigErrors.md), `ThrowOnError`>
