# renderElementToCanvas

> **renderElementToCanvas**(`element`: `HTMLElement`, `options?`: `Pick`<[`PdfExportOptions`](PdfExportOptions.md), `"onProgress"`>): `Promise`<`HTMLCanvasElement`>

Defined in: [src/lib/pdf-export.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/pdf-export.ts#230)

Render a DOM element to a canvas using iframe isolation.

This is the first half of the DOM capture pipeline: it clones the element
into an isolated iframe (to avoid affecting dark mode), copies stylesheets,
and uses html2canvas to produce a high-fidelity snapshot. The returned
canvas can be displayed as a preview before building the final PDF.

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

`Pick`<[`PdfExportOptions`](PdfExportOptions.md), `"onProgress"`>

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`HTMLCanvasElement`>
