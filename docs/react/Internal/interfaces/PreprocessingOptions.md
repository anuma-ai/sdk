# PreprocessingOptions

Defined in: [src/lib/processors/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#74)

Options for file preprocessing

## Properties

### keepOriginalFiles?

> `optional` **keepOriginalFiles**: `boolean`

Defined in: [src/lib/processors/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#85)

Whether to keep original file attachments (default: true)

***

### maxExtractedCharsPerFile?

> `optional` **maxExtractedCharsPerFile**: `number`

Defined in: [src/lib/processors/types.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#97)

Max characters of extracted text kept per file (default: 100,000). Longer text is cut and
ends with a `[truncated: …]` marker naming how much was kept.

***

### maxExtractedCharsTotal?

> `optional` **maxExtractedCharsTotal**: `number`

Defined in: [src/lib/processors/types.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#105)

Max characters of `extractedContent` across all files of one preprocessing run
(default: 200,000), counting each file's header, separator and truncation marker, not just
its text. Files are cut in order; files that find the budget already spent get no section of
their own — one combined `[truncated: …]` line names them, and their status is `truncated`.

***

### maxFileSizeBytes?

> `optional` **maxFileSizeBytes**: `number`

Defined in: [src/lib/processors/types.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#88)

Max file size to process in bytes (default: 10MB)

***

### onError()?

> `optional` **onError**: (`fileName`: `string`, `error`: `Error`) => `void`

Defined in: [src/lib/processors/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#111)

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

Defined in: [src/lib/processors/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#108)

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

Defined in: [src/lib/processors/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#82)

Processors to use.

* undefined (default): Use all built-in processors
* null or \[]: Disable preprocessing (every non-image file is reported `skipped` /
  `unsupported_type` in `fileStatuses`)
* FileProcessor\[]: Use specific processors

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/processors/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#91)

Timeout per file in milliseconds (default: 30000). Prevents hangs from slow CDN workers or large files.
