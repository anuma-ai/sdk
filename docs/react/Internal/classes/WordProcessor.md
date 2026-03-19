# WordProcessor

Defined in: [src/lib/processors/WordProcessor.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/WordProcessor.ts#10)

Processor for Word documents (.docx) that converts to markdown

## Implements

* [`FileProcessor`](../interfaces/FileProcessor.md)

## Constructors

### Constructor

> **new WordProcessor**(): `WordProcessor`

**Returns**

`WordProcessor`

## Properties

### name

> `readonly` **name**: `"word"` = `"word"`

Defined in: [src/lib/processors/WordProcessor.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/WordProcessor.ts#11)

Unique identifier for this processor

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`name`](../interfaces/FileProcessor.md#name)

***

### supportedExtensions

> `readonly` **supportedExtensions**: `string`\[]

Defined in: [src/lib/processors/WordProcessor.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/WordProcessor.ts#15)

File extensions this processor can handle (fallback if MIME type unavailable)

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedExtensions`](../interfaces/FileProcessor.md#supportedextensions)

***

### supportedMimeTypes

> `readonly` **supportedMimeTypes**: `string`\[]

Defined in: [src/lib/processors/WordProcessor.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/WordProcessor.ts#12)

MIME types this processor can handle

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedMimeTypes`](../interfaces/FileProcessor.md#supportedmimetypes)

## Methods

### process()

> **process**(`file`: [`FileWithData`](../interfaces/FileWithData.md)): `Promise`<[`ProcessedFileResult`](../interfaces/ProcessedFileResult.md) | `null`>

Defined in: [src/lib/processors/WordProcessor.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/WordProcessor.ts#17)

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

[`FileWithData`](../interfaces/FileWithData.md)

</td>
<td>

File metadata with data URL

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ProcessedFileResult`](../interfaces/ProcessedFileResult.md) | `null`>

Extracted text content and metadata, or null if processing fails/not applicable

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`process`](../interfaces/FileProcessor.md#process)
