# postWebhooksPrefinery

> **postWebhooksPrefinery**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostWebhooksPrefineryData`](../type-aliases/PostWebhooksPrefineryData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`PostWebhooksPrefineryResponses`](../type-aliases/PostWebhooksPrefineryResponses.md), [`PostWebhooksPrefineryErrors`](../type-aliases/PostWebhooksPrefineryErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1878](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1878)

Prefinery webhook receiver

Public route authenticated by X-Prefinery-Signature (HMAC-SHA256 over "{t}.{raw\_body}"). Persists the raw event and acks inside Prefinery's 15s budget; processing is asynchronous and order-independent.

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

`options?`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`PostWebhooksPrefineryData`](../type-aliases/PostWebhooksPrefineryData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostWebhooksPrefineryResponses`](../type-aliases/PostWebhooksPrefineryResponses.md), [`PostWebhooksPrefineryErrors`](../type-aliases/PostWebhooksPrefineryErrors.md), `ThrowOnError`>
