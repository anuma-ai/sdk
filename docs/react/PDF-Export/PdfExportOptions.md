# PdfExportOptions

Defined in: [src/lib/pdf-export.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#12)

Options for PDF export.

## Properties

### filename?

> `optional` **filename**: `string`

Defined in: [src/lib/pdf-export.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#29)

Filename used by the download helpers (default: "document.pdf")

***

### fontSize?

> `optional` **fontSize**: `number`

Defined in: [src/lib/pdf-export.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#16)

Font size in points for body text (default: 12)

***

### margins?

> `optional` **margins**: `object`

Defined in: [src/lib/pdf-export.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#20)

Page margins in mm (default: 20 on all sides)

**bottom?**

> `optional` **bottom**: `number`

**left?**

> `optional` **left**: `number`

**right?**

> `optional` **right**: `number`

**top?**

> `optional` **top**: `number`

***

### pageNumbers?

> `optional` **pageNumbers**: `boolean`

Defined in: [src/lib/pdf-export.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#27)

Whether to include page numbers (default: true)

***

### pageSize?

> `optional` **pageSize**: `"a4"` | `"letter"` | `"legal"`

Defined in: [src/lib/pdf-export.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#14)

Page size (default: "a4")

***

### title?

> `optional` **title**: `string`

Defined in: [src/lib/pdf-export.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#18)

Document title rendered at top of first page
