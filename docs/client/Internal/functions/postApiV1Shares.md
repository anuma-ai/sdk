# postApiV1Shares

> **postApiV1Shares**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SharesData`](../type-aliases/PostApiV1SharesData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SharesResponses`](../type-aliases/PostApiV1SharesResponses.md), [`PostApiV1SharesErrors`](../type-aliases/PostApiV1SharesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1521](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1521)

Publish an artifact to a public share link

Records a public share for media already uploaded to an allow-listed host and returns a slug + link. PROTOTYPE: no moderation gate; internal use only.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1SharesData`](../type-aliases/PostApiV1SharesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1SharesResponses`](../type-aliases/PostApiV1SharesResponses.md), [`PostApiV1SharesErrors`](../type-aliases/PostApiV1SharesErrors.md), `ThrowOnError`>
