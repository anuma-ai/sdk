# getApiV1AdminNearbyMeetupsById

> **getApiV1AdminNearbyMeetupsById**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminNearbyMeetupsByIdData`](../type-aliases/GetApiV1AdminNearbyMeetupsByIdData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminNearbyMeetupsByIdResponses`](../type-aliases/GetApiV1AdminNearbyMeetupsByIdResponses.md), [`GetApiV1AdminNearbyMeetupsByIdErrors`](../type-aliases/GetApiV1AdminNearbyMeetupsByIdErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:320](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#320)

Get a nearby meetup (admin)

Proxies nearby's meetup detail — the meetup, the reports filed against it and its attendees. Meetup data lives only in the nearby service; portal is a pass-through. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminNearbyMeetupsByIdData`](../type-aliases/GetApiV1AdminNearbyMeetupsByIdData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminNearbyMeetupsByIdResponses`](../type-aliases/GetApiV1AdminNearbyMeetupsByIdResponses.md), [`GetApiV1AdminNearbyMeetupsByIdErrors`](../type-aliases/GetApiV1AdminNearbyMeetupsByIdErrors.md), `ThrowOnError`>
