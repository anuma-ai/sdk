# postInternalNearbyActivations

> **postInternalNearbyActivations**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalNearbyActivationsData`](../type-aliases/PostInternalNearbyActivationsData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalNearbyActivationsResponses`](../type-aliases/PostInternalNearbyActivationsResponses.md), [`PostInternalNearbyActivationsErrors`](../type-aliases/PostInternalNearbyActivationsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1756](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1756)

Record a People Nearby activation

Internal server-to-server endpoint used by the nearby service. Reports that an account activated in People Nearby (created a profile and sent a first message), which is the trigger for two-sided ZETA referral rewards. Idempotent: a replayed activation returns 200 with recorded=false and creates no additional grants. An activation outside an active area, or one whose referrer is not yet resolved, is recorded and returns an empty grants array with a reason.

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

[`Options`](../type-aliases/Options.md)<[`PostInternalNearbyActivationsData`](../type-aliases/PostInternalNearbyActivationsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalNearbyActivationsResponses`](../type-aliases/PostInternalNearbyActivationsResponses.md), [`PostInternalNearbyActivationsErrors`](../type-aliases/PostInternalNearbyActivationsErrors.md), `ThrowOnError`>
