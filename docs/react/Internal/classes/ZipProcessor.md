# ZipProcessor

Defined in: [src/lib/processors/ZipProcessor.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ZipProcessor.ts#22)

Processor for ZIP archive files that extracts contents and delegates
to other processors for supported file types

## Implements

* [`FileProcessor`](../interfaces/FileProcessor.md)

## Constructors

### Constructor

> **new ZipProcessor**(`options`: [`ZipProcessorOptions`](../interfaces/ZipProcessorOptions.md)): `ZipProcessor`

Defined in: [src/lib/processors/ZipProcessor.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ZipProcessor.ts#40)

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

`options`

</td>
<td>

[`ZipProcessorOptions`](../interfaces/ZipProcessorOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`ZipProcessor`

## Properties

### name

> `readonly` **name**: `"zip"` = `"zip"`

Defined in: [src/lib/processors/ZipProcessor.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ZipProcessor.ts#23)

Unique identifier for this processor

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`name`](../interfaces/FileProcessor.md#name)

***

### supportedExtensions

> `readonly` **supportedExtensions**: `string`\[]

Defined in: [src/lib/processors/ZipProcessor.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ZipProcessor.ts#29)

File extensions this processor can handle (fallback if MIME type unavailable)

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedExtensions`](../interfaces/FileProcessor.md#supportedextensions)

***

### supportedMimeTypes

> `readonly` **supportedMimeTypes**: `string`\[]

Defined in: [src/lib/processors/ZipProcessor.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ZipProcessor.ts#24)

MIME types this processor can handle

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedMimeTypes`](../interfaces/FileProcessor.md#supportedmimetypes)

## Methods

### process()

> **process**(`file`: [`FileWithData`](../interfaces/FileWithData.md)): `Promise`<[`ProcessedFileResult`](../interfaces/ProcessedFileResult.md) | `null`>

Defined in: [src/lib/processors/ZipProcessor.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ZipProcessor.ts#53)

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

***

### setRegistry()

> **setRegistry**(`registry`: [`ProcessorRegistry`](ProcessorRegistry.md)): `void`

Defined in: [src/lib/processors/ZipProcessor.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ZipProcessor.ts#49)

Set the processor registry for handling nested files
This must be called before processing if you want nested file support

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

`registry`

</td>
<td>

[`ProcessorRegistry`](ProcessorRegistry.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
