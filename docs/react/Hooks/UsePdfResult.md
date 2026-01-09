# UsePdfResult

Defined in: [src/react/usePdf.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/usePdf.ts#L17)

Result returned by the usePdf hook.

## Properties

### error

> **error**: `Error` | `null`

Defined in: [src/react/usePdf.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/usePdf.ts#L23)

Error from the last PDF extraction attempt

***

### extractPdfContext()

> **extractPdfContext**: (`files`: [`PdfFile`](../Internal/interfaces/PdfFile.md)\[]) => `Promise`<`string` | `null`>

Defined in: [src/react/usePdf.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/usePdf.ts#L19)

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

Defined in: [src/react/usePdf.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/usePdf.ts#L21)

Whether PDF processing is in progress
