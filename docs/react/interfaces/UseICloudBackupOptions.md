# UseICloudBackupOptions

Defined in: [src/react/useICloudBackup.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L20)

Options for useICloudBackup hook

## Properties

### database

> **database**: `Database`

Defined in: [src/react/useICloudBackup.ts:22](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L22)

WatermelonDB database instance

***

### exportConversation()

> **exportConversation**: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

Defined in: [src/react/useICloudBackup.ts:28](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L28)

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

Defined in: [src/react/useICloudBackup.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L33)

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

Defined in: [src/react/useICloudBackup.ts:26](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L26)

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

Defined in: [src/react/useICloudBackup.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L24)

Current user address (null if not signed in)
