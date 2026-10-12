# PdfExportProgress

Defined in: [src/lib/pdf-export.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#8)

Progress event emitted during PDF export.

## Properties

### detail?

> `optional` **detail**: `string`

Defined in: [src/lib/pdf-export.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#14)

Optional human-readable detail, e.g. "Page 2 of 5"

***

### percent

> **percent**: `number`

Defined in: [src/lib/pdf-export.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#12)

Overall progress from 0 to 100

***

### stage

> **stage**: [`PdfExportStage`](PdfExportStage.md)

Defined in: [src/lib/pdf-export.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#10)

Current pipeline stage
