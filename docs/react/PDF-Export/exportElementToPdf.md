# exportElementToPdf

> **exportElementToPdf**(`element`: `HTMLElement`, `options?`: [`PdfExportOptions`](PdfExportOptions.md)): `Promise`<`Blob`>

Defined in: [src/lib/pdf-export.ts:354](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#354)

Capture a rendered HTML element as a high-fidelity PDF.

Uses [renderElementToCanvas](renderElementToCanvas.md) for the DOM snapshot, then embeds the
canvas image into a jsPDF document. Multi-page content is automatically
split.

## Parameters

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

[`PdfExportOptions`](PdfExportOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Blob`>
