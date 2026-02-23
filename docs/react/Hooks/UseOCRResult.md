# UseOCRResult

Defined in: [src/react/useOCR.ts:16](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useOCR.ts#L16)

Result returned by the useOCR hook.

## Properties

### error

> **error**: `Error` | `null`

Defined in: [src/react/useOCR.ts:22](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useOCR.ts#L22)

Error from the last OCR extraction attempt

***

### extractOCRContext()

> **extractOCRContext**: (`files`: [`OCRFile`](../Internal/interfaces/OCRFile.md)\[]) => `Promise`<`string` | `null`>

Defined in: [src/react/useOCR.ts:18](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useOCR.ts#L18)

Extract text from images using OCR

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

[`OCRFile`](../Internal/interfaces/OCRFile.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

***

### isProcessing

> **isProcessing**: `boolean`

Defined in: [src/react/useOCR.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useOCR.ts#L20)

Whether OCR processing is in progress
