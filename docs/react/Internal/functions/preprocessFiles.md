# preprocessFiles

> **preprocessFiles**(`files`: [`FileMetadata`](../interfaces/FileMetadata.md)\[] | `undefined`, `options`: [`PreprocessingOptions`](../interfaces/PreprocessingOptions.md)): `Promise`<[`PreprocessingResult`](../interfaces/PreprocessingResult.md)>

Defined in: [src/lib/processors/preprocessor.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/processors/preprocessor.ts#L35)

Preprocess files by extracting text content

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`files`

</td>
<td>

[`FileMetadata`](../interfaces/FileMetadata.md)\[] | `undefined`

</td>
<td>

Files to process

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`PreprocessingOptions`](../interfaces/PreprocessingOptions.md)

</td>
<td>

Preprocessing options

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`PreprocessingResult`](../interfaces/PreprocessingResult.md)>

Result with extracted content and metadata
