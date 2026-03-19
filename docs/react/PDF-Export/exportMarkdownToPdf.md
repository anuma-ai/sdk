# exportMarkdownToPdf

> **exportMarkdownToPdf**(`markdown`: `string`, `options?`: [`PdfExportOptions`](PdfExportOptions.md)): `Promise`<`Blob`>

Defined in: [src/lib/pdf-export.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#311)

Convert a markdown string to a PDF. No DOM required.

Uses `marked` to tokenize the markdown and `jsPDF` to render block-level
elements (headings, paragraphs, code blocks, lists, blockquotes, tables,
horizontal rules). Inline formatting (bold/italic) within paragraphs is
stripped in v1.

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

[`PdfExportOptions`](PdfExportOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Blob`>
