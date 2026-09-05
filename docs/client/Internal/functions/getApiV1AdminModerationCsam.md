# getApiV1AdminModerationCsam

> **getApiV1AdminModerationCsam**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminModerationCsamData`](../type-aliases/GetApiV1AdminModerationCsamData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminModerationCsamResponses`](../type-aliases/GetApiV1AdminModerationCsamResponses.md), [`GetApiV1AdminModerationCsamErrors`](../type-aliases/GetApiV1AdminModerationCsamErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#257)

List CSAM moderation events (admin)

Proxies nearby's CSAM review queue. CSAM data lives only in the nearby service; portal is a pass-through. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminModerationCsamData`](../type-aliases/GetApiV1AdminModerationCsamData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminModerationCsamResponses`](../type-aliases/GetApiV1AdminModerationCsamResponses.md), [`GetApiV1AdminModerationCsamErrors`](../type-aliases/GetApiV1AdminModerationCsamErrors.md), `ThrowOnError`>
