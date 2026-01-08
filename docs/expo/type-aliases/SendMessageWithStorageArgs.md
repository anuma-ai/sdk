# SendMessageWithStorageArgs

> **SendMessageWithStorageArgs** = `BaseSendMessageWithStorageArgs` & \{ `writeFile`: (`fileId`: `string`, `blob`: `Blob`, `options?`: \{ `onProgress?`: (`progress`: `number`) => `void`; `signal?`: `AbortSignal`; \}) => `Promise`\<`string`\>; \}

Defined in: [src/expo/useChatStorage.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L74)

Arguments for sendMessage with storage (Expo version)

Uses the base arguments without React-specific features (no runTools, no headers).
Includes writeFile for MCP image storage.

## Type Declaration

### writeFile()

> **writeFile**: (`fileId`: `string`, `blob`: `Blob`, `options?`: \{ `onProgress?`: (`progress`: `number`) => `void`; `signal?`: `AbortSignal`; \}) => `Promise`\<`string`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fileId` | `string` |
| `blob` | `Blob` |
| `options?` | \{ `onProgress?`: (`progress`: `number`) => `void`; `signal?`: `AbortSignal`; \} |
| `options.onProgress?` | (`progress`: `number`) => `void` |
| `options.signal?` | `AbortSignal` |

#### Returns

`Promise`\<`string`\>
