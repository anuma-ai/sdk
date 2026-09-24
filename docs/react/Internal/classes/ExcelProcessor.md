# ExcelProcessor

Defined in: [src/lib/processors/ExcelProcessor.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ExcelProcessor.ts#63)

Processor for Excel files (.xlsx) that converts each sheet to CSV.

CSV rather than JSON: JSON repeated every header on every row, several times the characters
for the same data, and ran into the text caps long before the data did.

Uses a dynamic import for exceljs so the heavy dependency tree is only
loaded when actually processing an Excel file.

## Implements

* [`FileProcessor`](../interfaces/FileProcessor.md)

## Constructors

### Constructor

> **new ExcelProcessor**(`options`: `object`): `ExcelProcessor`

Defined in: [src/lib/processors/ExcelProcessor.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ExcelProcessor.ts#72)

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

`object`

</td>
</tr>
<tr>
<td>

`options.maxRowsPerSheet?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`ExcelProcessor`

## Properties

### name

> `readonly` **name**: `"excel"` = `"excel"`

Defined in: [src/lib/processors/ExcelProcessor.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ExcelProcessor.ts#64)

Unique identifier for this processor

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`name`](../interfaces/FileProcessor.md#name)

***

### supportedExtensions

> `readonly` **supportedExtensions**: `string`\[]

Defined in: [src/lib/processors/ExcelProcessor.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ExcelProcessor.ts#68)

File extensions this processor can handle (fallback if MIME type unavailable)

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedExtensions`](../interfaces/FileProcessor.md#supportedextensions)

***

### supportedMimeTypes

> `readonly` **supportedMimeTypes**: `string`\[]

Defined in: [src/lib/processors/ExcelProcessor.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ExcelProcessor.ts#65)

MIME types this processor can handle

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedMimeTypes`](../interfaces/FileProcessor.md#supportedmimetypes)

## Methods

### process()

> **process**(`file`: [`FileWithData`](../interfaces/FileWithData.md)): `Promise`<[`ProcessedFileResult`](../interfaces/ProcessedFileResult.md) | `null`>

Defined in: [src/lib/processors/ExcelProcessor.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/ExcelProcessor.ts#81)

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
