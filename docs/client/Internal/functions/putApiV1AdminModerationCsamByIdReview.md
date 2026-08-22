# putApiV1AdminModerationCsamByIdReview

> **putApiV1AdminModerationCsamByIdReview**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PutApiV1AdminModerationCsamByIdReviewData`](../type-aliases/PutApiV1AdminModerationCsamByIdReviewData.md), `ThrowOnError`>): `RequestResult`<[`PutApiV1AdminModerationCsamByIdReviewResponses`](../type-aliases/PutApiV1AdminModerationCsamByIdReviewResponses.md), [`PutApiV1AdminModerationCsamByIdReviewErrors`](../type-aliases/PutApiV1AdminModerationCsamByIdReviewErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#264)

Record a CSAM event disposition (admin)

Proxies an operator's review to nearby (disposition ∈ reported\_to\_ncmec, account\_actioned, dismissed) and returns the updated event. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PutApiV1AdminModerationCsamByIdReviewData`](../type-aliases/PutApiV1AdminModerationCsamByIdReviewData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PutApiV1AdminModerationCsamByIdReviewResponses`](../type-aliases/PutApiV1AdminModerationCsamByIdReviewResponses.md), [`PutApiV1AdminModerationCsamByIdReviewErrors`](../type-aliases/PutApiV1AdminModerationCsamByIdReviewErrors.md), `ThrowOnError`>
