# PreprocessingResult

Defined in: [src/lib/processors/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#90)

Result from preprocessing files

## Properties

### extractedContent

> **extractedContent**: `string` | `null`

Defined in: [src/lib/processors/types.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#92)

Extracted content to prepend to user message

***

### imageContentUrls?

> `optional` **imageContentUrls**: `string`\[]

Defined in: [src/lib/processors/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#99)

Image data URLs for files where text extraction failed but page images were
rendered (e.g. scanned PDFs). The caller should inject these as `image_url`
content parts in the user message so the vision model can read the document.

***

### metadata

> **metadata**: `object`

Defined in: [src/lib/processors/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#108)

Processing metadata

**errorCount**

> **errorCount**: `number`

**processedCount**

> **processedCount**: `number`

**skippedCount**

> **skippedCount**: `number`

***

### originalFiles?

> `optional` **originalFiles**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/processors/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#102)

Original files (if keepOriginalFiles = true)

***

### preprocessedFileIds

> **preprocessedFileIds**: `string`\[]

Defined in: [src/lib/processors/types.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#105)

IDs of files that were successfully preprocessed (used to remove from message)
