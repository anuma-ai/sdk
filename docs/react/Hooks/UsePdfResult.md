# UsePdfResult

Defined in: [src/react/usePdf.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/react/usePdf.ts#18)

Result returned by the usePdf hook.

## Properties

### error

> **error**: `Error` | `null`

Defined in: [src/react/usePdf.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/react/usePdf.ts#24)

Error from the last PDF extraction attempt

***

### extractPdfContext()

> **extractPdfContext**: (`files`: [`PdfFile`](../Internal/interfaces/PdfFile.md)\[]) => `Promise`<`string` | `null`>

Defined in: [src/react/usePdf.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/react/usePdf.ts#20)

Extract text from PDF files

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

`files`

</td>
<td>

[`PdfFile`](../Internal/interfaces/PdfFile.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

***

### isProcessing

> **isProcessing**: `boolean`

Defined in: [src/react/usePdf.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/react/usePdf.ts#22)

Whether PDF processing is in progress
