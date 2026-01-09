# UseBackupOptions

Defined in: [src/react/useBackup.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L41)

Options for useBackup hook

## Properties

### database

> **database**: `Database`

Defined in: [src/react/useBackup.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L43)

WatermelonDB database instance

***

### dropboxFolder?

> `optional` **dropboxFolder**: `string`

Defined in: [src/react/useBackup.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L59)

Dropbox folder path for backups (default: '/ai-chat-app/conversations')

***

### exportConversation()

> **exportConversation**: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

Defined in: [src/react/useBackup.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L49)

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

Defined in: [src/react/useBackup.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L63)

Google Drive conversations subfolder (default: 'conversations')

***

### googleRootFolder?

> `optional` **googleRootFolder**: `string`

Defined in: [src/react/useBackup.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L61)

Google Drive root folder name (default: 'ai-chat-app')

***

### importConversation()

> **importConversation**: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>

Defined in: [src/react/useBackup.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L54)

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

Defined in: [src/react/useBackup.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L47)

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

Defined in: [src/react/useBackup.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L45)

Current user address (null if not signed in)
