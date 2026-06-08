# postApiV1AdminPrivyDevWipe

> **postApiV1AdminPrivyDevWipe**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminPrivyDevWipeData`](../type-aliases/PostApiV1AdminPrivyDevWipeData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminPrivyDevWipeResponses`](../type-aliases/PostApiV1AdminPrivyDevWipeResponses.md), [`PostApiV1AdminPrivyDevWipeErrors`](../type-aliases/PostApiV1AdminPrivyDevWipeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:368](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#368)

Bulk-delete test users from the Privy dev app

Lists Privy users, drops anyone in the in-code KEEP set, sorts by created\_at ascending, and deletes the oldest N (default 50, max 200). For each matched portal account also runs the cascading DB delete + Stripe cancellation. Requires admin API key. Refuses to run from any deployment whose PORTAL\_ENVIRONMENT is not "dev".

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminPrivyDevWipeData`](../type-aliases/PostApiV1AdminPrivyDevWipeData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminPrivyDevWipeResponses`](../type-aliases/PostApiV1AdminPrivyDevWipeResponses.md), [`PostApiV1AdminPrivyDevWipeErrors`](../type-aliases/PostApiV1AdminPrivyDevWipeErrors.md), `ThrowOnError`>
