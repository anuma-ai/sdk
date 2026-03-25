# PdfExportProgress

Defined in: [src/lib/pdf-export.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#12)

Progress event emitted during PDF export.

## Properties

### detail?

> `optional` **detail**: `string`

Defined in: [src/lib/pdf-export.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#18)

Optional human-readable detail, e.g. "Page 2 of 5"

***

### percent

> **percent**: `number`

Defined in: [src/lib/pdf-export.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#16)

Overall progress from 0 to 100

***

### stage

> **stage**: [`PdfExportStage`](PdfExportStage.md)

Defined in: [src/lib/pdf-export.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#14)

Current pipeline stage
