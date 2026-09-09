# postNearbyWaitlist

> **postNearbyWaitlist**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostNearbyWaitlistData`](../type-aliases/PostNearbyWaitlistData.md), `ThrowOnError`>): `RequestResult`<[`PostNearbyWaitlistResponses`](../type-aliases/PostNearbyWaitlistResponses.md), [`PostNearbyWaitlistErrors`](../type-aliases/PostNearbyWaitlistErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1896](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1896)

Join the Prefinery waitlist

Creates or updates the caller's waitlist tester and returns their position and share link. Idempotent per account: a repeat call with no area change makes no upstream call.

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

[`Options`](../type-aliases/Options.md)<[`PostNearbyWaitlistData`](../type-aliases/PostNearbyWaitlistData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostNearbyWaitlistResponses`](../type-aliases/PostNearbyWaitlistResponses.md), [`PostNearbyWaitlistErrors`](../type-aliases/PostNearbyWaitlistErrors.md), `ThrowOnError`>
