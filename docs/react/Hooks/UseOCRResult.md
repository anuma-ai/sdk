# UseOCRResult

Defined in: src/react/useOCR.ts:15

Result returned by the useOCR hook.

## Properties

### error

> **error**: `Error` | `null`

Defined in: src/react/useOCR.ts:21

Error from the last OCR extraction attempt

***

### extractOCRContext()

> **extractOCRContext**: (`files`: [`OCRFile`](../Internal/interfaces/OCRFile.md)\[]) => `Promise`<`string` | `null`>

Defined in: src/react/useOCR.ts:17

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

Defined in: src/react/useOCR.ts:19

Whether OCR processing is in progress
