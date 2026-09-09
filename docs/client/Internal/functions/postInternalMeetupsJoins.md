# postInternalMeetupsJoins

> **postInternalMeetupsJoins**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalMeetupsJoinsData`](../type-aliases/PostInternalMeetupsJoinsData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalMeetupsJoinsResponses`](../type-aliases/PostInternalMeetupsJoinsResponses.md), [`PostInternalMeetupsJoinsErrors`](../type-aliases/PostInternalMeetupsJoinsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1833](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1833)

Report a meetup join (internal)

Internal service-to-service endpoint used by the nearby service to push a meetup host when a guest's join is accepted. Fires one push per join (no digesting yet — see the handler doc). A host who opted out of the social category, has no registered devices, or triggers an event type silenced by the kill-switch, is reported as 200 with zero counts, not an error. guest\_display\_name must already be moderated by the caller. Gated behind the shared X-Service-Key.

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

[`Options`](../type-aliases/Options.md)<[`PostInternalMeetupsJoinsData`](../type-aliases/PostInternalMeetupsJoinsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalMeetupsJoinsResponses`](../type-aliases/PostInternalMeetupsJoinsResponses.md), [`PostInternalMeetupsJoinsErrors`](../type-aliases/PostInternalMeetupsJoinsErrors.md), `ThrowOnError`>
