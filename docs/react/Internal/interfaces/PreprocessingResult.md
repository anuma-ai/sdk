# PreprocessingResult

Defined in: [src/lib/processors/types.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L83)

Result from preprocessing files

## Properties

### extractedContent

> **extractedContent**: `string` | `null`

Defined in: [src/lib/processors/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L85)

Extracted content to prepend to user message

***

### metadata

> **metadata**: `object`

Defined in: [src/lib/processors/types.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L94)

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

Defined in: [src/lib/processors/types.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L88)

Original files (if keepOriginalFiles = true)

***

### preprocessedFileIds

> **preprocessedFileIds**: `string`\[]

Defined in: [src/lib/processors/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#L91)

IDs of files that were successfully preprocessed (used to remove from message)
