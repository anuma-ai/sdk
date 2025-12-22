# UseGoogleDriveBackupOptions

Defined in: [src/react/useGoogleDriveBackup.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L21)

Options for useGoogleDriveBackup hook

## Properties

### conversationsFolder?

> `optional` **conversationsFolder**: `string`

Defined in: [src/react/useGoogleDriveBackup.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L41)

Subfolder for conversations (default: 'conversations')

***

### database

> **database**: `Database`

Defined in: [src/react/useGoogleDriveBackup.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L23)

WatermelonDB database instance

***

### exportConversation()

> **exportConversation**: (`conversationId`, `userAddress`) => `Promise`\<\{ `blob?`: `Blob`; `success`: `boolean`; \}\>

Defined in: [src/react/useGoogleDriveBackup.ts:29](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L29)

Export a conversation to an encrypted blob

#### Parameters

##### conversationId

`string`

##### userAddress

`string`

#### Returns

`Promise`\<\{ `blob?`: `Blob`; `success`: `boolean`; \}\>

***

### importConversation()

> **importConversation**: (`blob`, `userAddress`) => `Promise`\<\{ `success`: `boolean`; \}\>

Defined in: [src/react/useGoogleDriveBackup.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L34)

Import a conversation from an encrypted blob

#### Parameters

##### blob

`Blob`

##### userAddress

`string`

#### Returns

`Promise`\<\{ `success`: `boolean`; \}\>

***

### requestEncryptionKey()

> **requestEncryptionKey**: (`address`) => `Promise`\<`void`\>

Defined in: [src/react/useGoogleDriveBackup.ts:27](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L27)

Request encryption key for the user address

#### Parameters

##### address

`string`

#### Returns

`Promise`\<`void`\>

***

### rootFolder?

> `optional` **rootFolder**: `string`

Defined in: [src/react/useGoogleDriveBackup.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L39)

Root folder name in Google Drive (default: 'ai-chat-app')

***

### userAddress

> **userAddress**: `string` \| `null`

Defined in: [src/react/useGoogleDriveBackup.ts:25](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L25)

Current user address (null if not signed in)
