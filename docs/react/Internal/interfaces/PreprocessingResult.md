# PreprocessingResult

Defined in: [src/lib/processors/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#152)

Result from preprocessing files

## Properties

### extractedContent

> **extractedContent**: `string` | `null`

Defined in: [src/lib/processors/types.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#154)

Extracted content to prepend to user message

***

### fileStatuses

> **fileStatuses**: [`FileProcessingStatus`](FileProcessingStatus.md)\[]

Defined in: [src/lib/processors/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#173)

One entry per input file, in input order. Image files (`image/*`) with no processor are
left out: callers send those directly as `image_url` parts, so they are not "skipped".

***

### imageContentUrls?

> `optional` **imageContentUrls**: `string`\[]

Defined in: [src/lib/processors/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#161)

Image data URLs for files where text extraction failed but page images were
rendered (e.g. scanned PDFs). The caller should inject these as `image_url`
content parts in the user message so the vision model can read the document.

***

### metadata

> **metadata**: `object`

Defined in: [src/lib/processors/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#176)

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

Defined in: [src/lib/processors/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#164)

Original files (if keepOriginalFiles = true)

***

### preprocessedFileIds

> **preprocessedFileIds**: `string`\[]

Defined in: [src/lib/processors/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#167)

IDs of files that were successfully preprocessed (used to remove from message)
