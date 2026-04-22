# TextProcessor

Defined in: [src/lib/processors/TextProcessor.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/TextProcessor.ts#53)

Processor for plain-text files (.md, .txt, .csv, .json, .yaml, etc.) that
decodes the file's data URL as UTF-8 and inlines the contents into the user
message.

Unlike PDF/Word/Excel, no transformation is needed — the raw text IS the
extractable content. Without this processor, text files attached in the UI
would be visible as attachments but their contents would never reach the
model (only `image/*` files are inlined directly by callers).

## Implements

* [`FileProcessor`](../interfaces/FileProcessor.md)

## Constructors

### Constructor

> **new TextProcessor**(): `TextProcessor`

**Returns**

`TextProcessor`

## Properties

### name

> `readonly` **name**: `"text"` = `"text"`

Defined in: [src/lib/processors/TextProcessor.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/TextProcessor.ts#54)

Unique identifier for this processor

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`name`](../interfaces/FileProcessor.md#name)

***

### supportedExtensions

> `readonly` **supportedExtensions**: (`".json"` | `".txt"` | `".md"` | `".markdown"` | `".csv"` | `".tsv"` | `".jsonl"` | `".ndjson"` | `".log"` | `".yaml"` | `".yml"` | `".xml"` | `".html"` | `".htm"` | `".ini"` | `".toml"` | `".cfg"` | `".conf"`)\[]

Defined in: [src/lib/processors/TextProcessor.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/TextProcessor.ts#56)

File extensions this processor can handle (fallback if MIME type unavailable)

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedExtensions`](../interfaces/FileProcessor.md#supportedextensions)

***

### supportedMimeTypes

> `readonly` **supportedMimeTypes**: (`"application/json"` | `"text/plain"` | `"text/markdown"` | `"text/x-markdown"` | `"text/csv"` | `"text/tab-separated-values"` | `"text/html"` | `"text/xml"` | `"text/yaml"` | `"text/x-yaml"` | `"application/ld+json"` | `"application/xml"` | `"application/yaml"` | `"application/x-yaml"`)\[]

Defined in: [src/lib/processors/TextProcessor.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/TextProcessor.ts#55)

MIME types this processor can handle

**Implementation of**

[`FileProcessor`](../interfaces/FileProcessor.md).[`supportedMimeTypes`](../interfaces/FileProcessor.md#supportedmimetypes)

## Methods

### process()

> **process**(`file`: [`FileWithData`](../interfaces/FileWithData.md)): `Promise`<[`ProcessedFileResult`](../interfaces/ProcessedFileResult.md) | `null`>

Defined in: [src/lib/processors/TextProcessor.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/TextProcessor.ts#58)

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
