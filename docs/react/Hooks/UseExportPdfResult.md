# UseExportPdfResult

Defined in: [src/react/useExportPdf.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#10)

Result returned by the useExportPdf hook.

## Properties

### downloadElementAsPdf()

> **downloadElementAsPdf**: (`element`: `HTMLElement`, `options?`: [`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)) => `Promise`<`void`>

Defined in: [src/react/useExportPdf.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#16)

Convenience: export element and trigger browser download

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

`element`

</td>
<td>

`HTMLElement`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### downloadMarkdownAsPdf()

> **downloadMarkdownAsPdf**: (`markdown`: `string`, `options?`: [`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)) => `Promise`<`void`>

Defined in: [src/react/useExportPdf.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#18)

Convenience: export markdown and trigger browser download

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

`markdown`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### error

> **error**: `Error` | `null`

Defined in: [src/react/useExportPdf.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#26)

Error from the last export attempt

***

### exportElementToPdf()

> **exportElementToPdf**: (`element`: `HTMLElement`, `options?`: [`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)) => `Promise`<`Blob`>

Defined in: [src/react/useExportPdf.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#12)

DOM capture: export a rendered HTML element as a high-fidelity PDF

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

`element`

</td>
<td>

`HTMLElement`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Blob`>

***

### exportMarkdownToPdf()

> **exportMarkdownToPdf**: (`markdown`: `string`, `options?`: [`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)) => `Promise`<`Blob`>

Defined in: [src/react/useExportPdf.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#14)

Headless: export a raw markdown string as PDF (no DOM required)

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

`markdown`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`PdfExportOptions`](../PDF-Export/PdfExportOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Blob`>

***

### isExporting

> **isExporting**: `boolean`

Defined in: [src/react/useExportPdf.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#22)

Whether a PDF export is currently in progress

***

### progress

> **progress**: [`PdfExportProgress`](../PDF-Export/PdfExportProgress.md) | `null`

Defined in: [src/react/useExportPdf.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#24)

Current export progress, or null when idle

***

### renderElementToCanvas()

> **renderElementToCanvas**: (`element`: `HTMLElement`) => `Promise`<`HTMLCanvasElement`>

Defined in: [src/react/useExportPdf.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#20)

Render an element to canvas for preview (first half of DOM capture pipeline)

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

`element`

</td>
<td>

`HTMLElement`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`HTMLCanvasElement`>
