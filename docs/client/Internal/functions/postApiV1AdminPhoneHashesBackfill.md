# postApiV1AdminPhoneHashesBackfill

> **postApiV1AdminPhoneHashesBackfill**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminPhoneHashesBackfillData`](../type-aliases/PostApiV1AdminPhoneHashesBackfillData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminPhoneHashesBackfillResponses`](../type-aliases/PostApiV1AdminPhoneHashesBackfillResponses.md), [`PostApiV1AdminPhoneHashesBackfillErrors`](../type-aliases/PostApiV1AdminPhoneHashesBackfillErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:436](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#436)

Backfill phone hashes from Privy

For each wallet account with a Privy DID, fetches the linked phone from Privy and upserts accounts.phone\_hash. Idempotent; unique collisions are counted, not fatal.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminPhoneHashesBackfillData`](../type-aliases/PostApiV1AdminPhoneHashesBackfillData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminPhoneHashesBackfillResponses`](../type-aliases/PostApiV1AdminPhoneHashesBackfillResponses.md), [`PostApiV1AdminPhoneHashesBackfillErrors`](../type-aliases/PostApiV1AdminPhoneHashesBackfillErrors.md), `ThrowOnError`>
