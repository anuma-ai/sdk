# ProcessedFileResult

Defined in: [src/lib/processors/types.ts:14](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/processors/types.ts#L14)

Result from processing a file

## Properties

### extractedText

> **extractedText**: `string`

Defined in: [src/lib/processors/types.ts:16](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/processors/types.ts#L16)

Extracted text content

***

### format

> **format**: `"json"` | `"plain"` | `"markdown"`

Defined in: [src/lib/processors/types.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/processors/types.ts#L19)

Format hint for how text should be presented

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/lib/processors/types.ts:22](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/processors/types.ts#L22)

Optional metadata about the extraction

**Index Signature**

\[`key`: `string`]: `any`

**pageCount?**

> `optional` **pageCount**: `number`

**sheetCount?**

> `optional` **sheetCount**: `number`

**sheetNames?**

> `optional` **sheetNames**: `string`\[]

**wordCount?**

> `optional` **wordCount**: `number`
