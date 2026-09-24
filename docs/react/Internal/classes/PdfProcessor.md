# PdfProcessor

Defined in: [src/lib/processors/PdfProcessor.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/PdfProcessor.ts#112)

Processor for PDF files that extracts text content page by page.

Pages without a usable text layer (scanned pages, including scans inside an otherwise-digital
document) are rendered as images, up to MAX\_IMAGE\_PAGES, so a vision model can read
them. A note at the top of the text states exactly which pages arrived as images and which
were left out.

## Implements

* [`FileProcessor`](../interfaces/FileProcessor.md)

## Constructors

### Constructor

> **new PdfProcessor**(): `PdfProcessor`

**Returns**

`PdfProcessor`

## Properties

### name

> `readonly` **name**: `"pdf"` = `"pdf"`

Defined in: [src/lib/processors/PdfProcessor.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/PdfProcessor.ts#113)

Unique identifier for this processor

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`name`](../interfaces/FileProcessor.md#name)

***

### supportedExtensions

> `readonly` **supportedExtensions**: `string`\[]

Defined in: [src/lib/processors/PdfProcessor.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/PdfProcessor.ts#115)

File extensions this processor can handle (fallback if MIME type unavailable)

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedExtensions`](../interfaces/FileProcessor.md#supportedextensions)

***

### supportedMimeTypes

> `readonly` **supportedMimeTypes**: `string`\[]

Defined in: [src/lib/processors/PdfProcessor.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/PdfProcessor.ts#114)

MIME types this processor can handle

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedMimeTypes`](../interfaces/FileProcessor.md#supportedmimetypes)

## Methods

### process()

> **process**(`file`: [`FileWithData`](../interfaces/FileWithData.md)): `Promise`<[`ProcessedFileResult`](../interfaces/ProcessedFileResult.md) | `null`>

Defined in: [src/lib/processors/PdfProcessor.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/PdfProcessor.ts#117)

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
