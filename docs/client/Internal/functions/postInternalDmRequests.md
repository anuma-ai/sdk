# postInternalDmRequests

> **postInternalDmRequests**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalDmRequestsData`](../type-aliases/PostInternalDmRequestsData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalDmRequestsResponses`](../type-aliases/PostInternalDmRequestsResponses.md), [`PostInternalDmRequestsErrors`](../type-aliases/PostInternalDmRequestsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1791](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1791)

Report a new DM request (internal)

Internal service-to-service endpoint used by the nearby service to push a recipient when a new DM request lands. Fires once per request, carrying the sender's display name only, never message content. A recipient who opted out of the messages category, has no registered devices, or triggers an event type silenced by the kill-switch, is reported as 200 with zero counts, not an error. sender\_display\_name must already be moderated by the caller. Gated behind the shared X-Service-Key.

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

[`Options`](../type-aliases/Options.md)<[`PostInternalDmRequestsData`](../type-aliases/PostInternalDmRequestsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalDmRequestsResponses`](../type-aliases/PostInternalDmRequestsResponses.md), [`PostInternalDmRequestsErrors`](../type-aliases/PostInternalDmRequestsErrors.md), `ThrowOnError`>
