# FileProcessor

Defined in: [src/lib/processors/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L34)

Interface that all file processors must implement

## Properties

### name

> `readonly` **name**: `string`

Defined in: [src/lib/processors/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L36)

Unique identifier for this processor

***

### supportedExtensions

> `readonly` **supportedExtensions**: `string`\[]

Defined in: [src/lib/processors/types.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L42)

File extensions this processor can handle (fallback if MIME type unavailable)

***

### supportedMimeTypes

> `readonly` **supportedMimeTypes**: `string`\[]

Defined in: [src/lib/processors/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L39)

MIME types this processor can handle

## Methods

### process()

> **process**(`file`: [`FileWithData`](FileWithData.md)): `Promise`<[`ProcessedFileResult`](ProcessedFileResult.md) | `null`>

Defined in: [src/lib/processors/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L49)

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
