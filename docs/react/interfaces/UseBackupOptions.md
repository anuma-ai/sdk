# UseBackupOptions

Defined in: [src/react/useBackup.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L40)

Options for useBackup hook

## Properties

### database

> **database**: `Database`

Defined in: [src/react/useBackup.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L42)

WatermelonDB database instance

***

### dropboxFolder?

> `optional` **dropboxFolder**: `string`

Defined in: [src/react/useBackup.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L58)

Dropbox folder path for backups (default: '/ai-chat-app/conversations')

***

### exportConversation()

> **exportConversation**: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

Defined in: [src/react/useBackup.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L48)

Export a conversation to an encrypted blob

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `conversationId` | `string` |
| `userAddress` | `string` |

**Returns**

`Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

***

### googleConversationsFolder?

> `optional` **googleConversationsFolder**: `string`

Defined in: [src/react/useBackup.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L62)

Google Drive conversations subfolder (default: 'conversations')

***

### googleRootFolder?

> `optional` **googleRootFolder**: `string`

Defined in: [src/react/useBackup.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L60)

Google Drive root folder name (default: 'ai-chat-app')

***

### importConversation()

> **importConversation**: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>

Defined in: [src/react/useBackup.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L53)

Import a conversation from an encrypted blob

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `blob` | `Blob` |
| `userAddress` | `string` |

**Returns**

`Promise`<{ `success`: `boolean`; }>

***

### requestEncryptionKey()

> **requestEncryptionKey**: (`address`: `string`) => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L46)

Request encryption key for the user address

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `address` | `string` |

**Returns**

`Promise`<`void`>

***

### userAddress

> **userAddress**: `string` | `null`

Defined in: [src/react/useBackup.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L44)

Current user address (null if not signed in)
