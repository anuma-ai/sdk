# PreprocessingOptions

Defined in: [src/lib/processors/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#62)

Options for file preprocessing

## Properties

### keepOriginalFiles?

> `optional` **keepOriginalFiles**: `boolean`

Defined in: [src/lib/processors/types.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#72)

Whether to keep original file attachments (default: true)

***

### maxFileSizeBytes?

> `optional` **maxFileSizeBytes**: `number`

Defined in: [src/lib/processors/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#75)

Max file size to process in bytes (default: 10MB)

***

### onError()?

> `optional` **onError**: (`fileName`: `string`, `error`: `Error`) => `void`

Defined in: [src/lib/processors/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#84)

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

Defined in: [src/lib/processors/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#81)

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

Defined in: [src/lib/processors/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#69)

Processors to use.

* undefined (default): Use all built-in processors
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/processors/types.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#78)

Timeout per file in milliseconds (default: 30000). Prevents hangs from slow CDN workers or large files.
