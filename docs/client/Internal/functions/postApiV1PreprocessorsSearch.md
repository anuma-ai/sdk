# postApiV1PreprocessorsSearch

> **postApiV1PreprocessorsSearch**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsSearchData`](../type-aliases/PostApiV1PreprocessorsSearchData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1PreprocessorsSearchResponses`](../type-aliases/PostApiV1PreprocessorsSearchResponses.md), [`PostApiV1PreprocessorsSearchErrors`](../type-aliases/PostApiV1PreprocessorsSearchErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1437](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1437)

Search the web

Forwards a query to Anuma Search and returns normalized web results. Used by SDK pre-processors to enrich prompts with live web context.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsSearchData`](../type-aliases/PostApiV1PreprocessorsSearchData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1PreprocessorsSearchResponses`](../type-aliases/PostApiV1PreprocessorsSearchResponses.md), [`PostApiV1PreprocessorsSearchErrors`](../type-aliases/PostApiV1PreprocessorsSearchErrors.md), `ThrowOnError`>
