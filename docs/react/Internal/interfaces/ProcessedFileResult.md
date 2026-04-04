# ProcessedFileResult

Defined in: [src/lib/processors/types.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#14)

Result from processing a file

## Properties

### extractedText

> **extractedText**: `string`

Defined in: [src/lib/processors/types.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#16)

Extracted text content

***

### format

> **format**: `"json"` | `"plain"` | `"markdown"`

Defined in: [src/lib/processors/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#19)

Format hint for how text should be presented

***

### imageDataUrls?

> `optional` **imageDataUrls**: `string`\[]

Defined in: [src/lib/processors/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#26)

Fallback image data URLs (base64 PNG) when text extraction yields no content.
For example, scanned PDFs have no extractable text — rendering each page as an
image lets the vision model read the document instead.

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/lib/processors/types.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#29)

Optional metadata about the extraction

**Index Signature**

\[`key`: `string`]: `unknown`

**pageCount?**

> `optional` **pageCount**: `number`

**sheetCount?**

> `optional` **sheetCount**: `number`

**sheetNames?**

> `optional` **sheetNames**: `string`\[]

**wordCount?**

> `optional` **wordCount**: `number`
