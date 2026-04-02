# postApiV1AdminMigrateCredits

> **postApiV1AdminMigrateCredits**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminMigrateCreditsData`](../type-aliases/PostApiV1AdminMigrateCreditsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminMigrateCreditsResponses`](../type-aliases/PostApiV1AdminMigrateCreditsResponses.md), [`PostApiV1AdminMigrateCreditsErrors`](../type-aliases/PostApiV1AdminMigrateCreditsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#234)

Migrate enrolled users to credits

Calls migrateEnrolledUsersToCredits on the escrow contract for unmigrated enrolled users, processing in batches. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminMigrateCreditsData`](../type-aliases/PostApiV1AdminMigrateCreditsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminMigrateCreditsResponses`](../type-aliases/PostApiV1AdminMigrateCreditsResponses.md), [`PostApiV1AdminMigrateCreditsErrors`](../type-aliases/PostApiV1AdminMigrateCreditsErrors.md), `ThrowOnError`>
