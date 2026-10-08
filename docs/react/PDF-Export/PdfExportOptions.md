# PdfExportOptions

Defined in: [src/lib/pdf-export.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#21)

Options for PDF export.

## Properties

### filename?

> `optional` **filename**: `string`

Defined in: [src/lib/pdf-export.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#38)

Filename used by the download helpers (default: "document.pdf")

***

### fontSize?

> `optional` **fontSize**: `number`

Defined in: [src/lib/pdf-export.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#25)

Font size in points for body text (default: 12)

***

### margins?

> `optional` **margins**: `object`

Defined in: [src/lib/pdf-export.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#29)

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

### onProgress()?

> `optional` **onProgress**: (`progress`: [`PdfExportProgress`](PdfExportProgress.md)) => `void`

Defined in: [src/lib/pdf-export.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#40)

Callback for progress updates during export

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`progress`

</td>
<td>

[`PdfExportProgress`](PdfExportProgress.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### pageNumbers?

> `optional` **pageNumbers**: `boolean`

Defined in: [src/lib/pdf-export.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#36)

Whether to include page numbers (default: true)

***

### pageSize?

> `optional` **pageSize**: `"a4"` | `"letter"` | `"legal"`

Defined in: [src/lib/pdf-export.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#23)

Page size (default: "a4")

***

### title?

> `optional` **title**: `string`

Defined in: [src/lib/pdf-export.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#27)

Document title rendered at top of first page
