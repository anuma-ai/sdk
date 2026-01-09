# UseDropboxBackupOptions

Defined in: [src/react/useDropboxBackup.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L20)

Options for useDropboxBackup hook

## Properties

### backupFolder?

> `optional` **backupFolder**: `string`

Defined in: [src/react/useDropboxBackup.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L38)

Dropbox folder path for backups (default: '/ai-chat-app/conversations')

***

### database

> **database**: `Database`

Defined in: [src/react/useDropboxBackup.ts:22](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L22)

WatermelonDB database instance

***

### exportConversation()

> **exportConversation**: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

Defined in: [src/react/useDropboxBackup.ts:28](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L28)

Export a conversation to an encrypted blob

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `conversationId` | `string` |
| `userAddress` | `string` |

**Returns**

`Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

***

### importConversation()

> **importConversation**: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>

Defined in: [src/react/useDropboxBackup.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L33)

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

Defined in: [src/react/useDropboxBackup.ts:26](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L26)

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

Defined in: [src/react/useDropboxBackup.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L24)

Current user address (null if not signed in)
