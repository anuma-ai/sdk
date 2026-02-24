# PreprocessingOptions

Defined in: [src/lib/processors/types.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L55)

Options for file preprocessing

## Properties

### keepOriginalFiles?

> `optional` **keepOriginalFiles**: `boolean`

Defined in: [src/lib/processors/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L65)

Whether to keep original file attachments (default: true)

***

### maxFileSizeBytes?

> `optional` **maxFileSizeBytes**: `number`

Defined in: [src/lib/processors/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L68)

Max file size to process in bytes (default: 10MB)

***

### onError()?

> `optional` **onError**: (`fileName`: `string`, `error`: `Error`) => `void`

Defined in: [src/lib/processors/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L77)

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

Defined in: [src/lib/processors/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L74)

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

Defined in: [src/lib/processors/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L62)

Processors to use.

* undefined (default): Use all built-in processors
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/processors/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L71)

Timeout per file in milliseconds (default: 30000). Prevents hangs from slow CDN workers or large files.
