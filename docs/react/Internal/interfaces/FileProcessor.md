# FileProcessor

Defined in: [src/lib/processors/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#41)

Interface that all file processors must implement

## Properties

### name

> `readonly` **name**: `string`

Defined in: [src/lib/processors/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#43)

Unique identifier for this processor

***

### supportedExtensions

> `readonly` **supportedExtensions**: `string`\[]

Defined in: [src/lib/processors/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#49)

File extensions this processor can handle (fallback if MIME type unavailable)

***

### supportedMimeTypes

> `readonly` **supportedMimeTypes**: `string`\[]

Defined in: [src/lib/processors/types.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#46)

MIME types this processor can handle

## Methods

### process()

> **process**(`file`: [`FileWithData`](FileWithData.md)): `Promise`<[`ProcessedFileResult`](ProcessedFileResult.md) | `null`>

Defined in: [src/lib/processors/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#56)

Process a file and extract text content

**Parameters**

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

`file`

</td>
<td>

[`FileWithData`](FileWithData.md)

</td>
<td>

File metadata with data URL

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ProcessedFileResult`](ProcessedFileResult.md) | `null`>

Extracted text content and metadata, or null if processing fails/not applicable
