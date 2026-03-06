# getApiV1TextByChannelLookup

> **getApiV1TextByChannelLookup**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1TextByChannelLookupData`](../type-aliases/GetApiV1TextByChannelLookupData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1TextByChannelLookupResponses`](../type-aliases/GetApiV1TextByChannelLookupResponses.md), [`GetApiV1TextByChannelLookupErrors`](../type-aliases/GetApiV1TextByChannelLookupErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:798](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#798)

Lookup text channel registration by identifier

Looks up an active text channel registration by identifier. Requires service-level API key authentication. Results are scoped to the calling app.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1TextByChannelLookupData`](../type-aliases/GetApiV1TextByChannelLookupData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1TextByChannelLookupResponses`](../type-aliases/GetApiV1TextByChannelLookupResponses.md), [`GetApiV1TextByChannelLookupErrors`](../type-aliases/GetApiV1TextByChannelLookupErrors.md), `ThrowOnError`>
