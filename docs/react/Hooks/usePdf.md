# usePdf()

> **usePdf**(): { `error`: `Error` | `null`; `extractPdfContext`: (`files`: [`PdfFile`](../Internal/interfaces/PdfFile.md)\[]) => `Promise`<`string` | `null`>; `isProcessing`: `boolean`; }

Defined in: [src/react/usePdf.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/usePdf.ts#L17)

React hook for extracting text from PDF files.

## Returns

{ `error`: `Error` | `null`; `extractPdfContext`: (`files`: [`PdfFile`](../Internal/interfaces/PdfFile.md)\[]) => `Promise`<`string` | `null`>; `isProcessing`: `boolean`; }

### error

> **error**: `Error` | `null`

### extractPdfContext()

> **extractPdfContext**: (`files`: [`PdfFile`](../Internal/interfaces/PdfFile.md)\[]) => `Promise`<`string` | `null`>

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `files` | [`PdfFile`](../Internal/interfaces/PdfFile.md)\[] |

**Returns**

`Promise`<`string` | `null`>

### isProcessing

> **isProcessing**: `boolean`
