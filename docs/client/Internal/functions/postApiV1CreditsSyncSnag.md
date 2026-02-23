# postApiV1CreditsSyncSnag

> **postApiV1CreditsSyncSnag**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsSyncSnagData`](../type-aliases/PostApiV1CreditsSyncSnagData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1CreditsSyncSnagResponses`](../type-aliases/PostApiV1CreditsSyncSnagResponses.md), [`PostApiV1CreditsSyncSnagErrors`](../type-aliases/PostApiV1CreditsSyncSnagErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:290](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L290)

Sync Snag points

Queries Snag for the user's current loyalty points and converts any new points to Portal credits using the configured conversion rate.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsSyncSnagData`](../type-aliases/PostApiV1CreditsSyncSnagData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1CreditsSyncSnagResponses`](../type-aliases/PostApiV1CreditsSyncSnagResponses.md), [`PostApiV1CreditsSyncSnagErrors`](../type-aliases/PostApiV1CreditsSyncSnagErrors.md), `ThrowOnError`>
