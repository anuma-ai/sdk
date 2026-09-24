# PreprocessingOptions

Defined in: [src/lib/processors/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#74)

Options for file preprocessing

## Properties

### keepOriginalFiles?

> `optional` **keepOriginalFiles**: `boolean`

Defined in: [src/lib/processors/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#84)

Whether to keep original file attachments (default: true)

***

### maxExtractedCharsPerFile?

> `optional` **maxExtractedCharsPerFile**: `number`

Defined in: [src/lib/processors/types.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#96)

Max characters of extracted text kept per file (default: 100,000). Longer text is cut and
ends with a `[truncated: …]` marker naming how much was kept.

***

### maxExtractedCharsTotal?

> `optional` **maxExtractedCharsTotal**: `number`

Defined in: [src/lib/processors/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#102)

Max characters of extracted text kept across all files of one preprocessing run
(default: 200,000). Files past the budget are cut (or reduced to the marker) in order.

***

### maxFileSizeBytes?

> `optional` **maxFileSizeBytes**: `number`

Defined in: [src/lib/processors/types.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#87)

Max file size to process in bytes (default: 10MB)

***

### onError()?

> `optional` **onError**: (`fileName`: `string`, `error`: `Error`) => `void`

Defined in: [src/lib/processors/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#108)

Callback for errors (non-fatal)

**Parameters**

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

`fileName`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onProgress()?

> `optional` **onProgress**: (`current`: `number`, `total`: `number`, `fileName`: `string`) => `void`

Defined in: [src/lib/processors/types.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#105)

Callback for progress updates

**Parameters**

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

`current`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`total`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`fileName`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### processors?

> `optional` **processors**: [`FileProcessor`](FileProcessor.md)\[] | `null`

Defined in: [src/lib/processors/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#81)

Processors to use.

* undefined (default): Use all built-in processors
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/processors/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#90)

Timeout per file in milliseconds (default: 30000). Prevents hangs from slow CDN workers or large files.
