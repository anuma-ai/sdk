# useOCR()

> **useOCR**(): { `error`: `Error` | `null`; `extractOCRContext`: (`files`: [`OCRFile`](../Internal/interfaces/OCRFile.md)\[]) => `Promise`<`string` | `null`>; `isProcessing`: `boolean`; }

Defined in: [src/react/useOCR.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useOCR.ts#L15)

React hook for extracting text from images using OCR.

## Returns

{ `error`: `Error` | `null`; `extractOCRContext`: (`files`: [`OCRFile`](../Internal/interfaces/OCRFile.md)\[]) => `Promise`<`string` | `null`>; `isProcessing`: `boolean`; }

### error

> **error**: `Error` | `null`

### extractOCRContext()

> **extractOCRContext**: (`files`: [`OCRFile`](../Internal/interfaces/OCRFile.md)\[]) => `Promise`<`string` | `null`>

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `files` | [`OCRFile`](../Internal/interfaces/OCRFile.md)\[] |

**Returns**

`Promise`<`string` | `null`>

### isProcessing

> **isProcessing**: `boolean`
