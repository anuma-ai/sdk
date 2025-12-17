# UseGoogleDriveBackupOptions

Defined in: [src/react/useGoogleDriveBackup.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L20)

Options for useGoogleDriveBackup hook

## Properties

### accessToken

> **accessToken**: `string` \| `null`

Defined in: [src/react/useGoogleDriveBackup.ts:26](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L26)

Current Google Drive access token (null if not authenticated)

***

### conversationsFolder?

> `optional` **conversationsFolder**: `string`

Defined in: [src/react/useGoogleDriveBackup.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L44)

Subfolder for conversations (default: 'conversations')

***

### database

> **database**: `Database`

Defined in: [src/react/useGoogleDriveBackup.ts:22](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L22)

WatermelonDB database instance

***

### exportConversation()

> **exportConversation**: (`conversationId`, `userAddress`) => `Promise`\<\{ `blob?`: `Blob`; `success`: `boolean`; \}\>

Defined in: [src/react/useGoogleDriveBackup.ts:32](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L32)

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

Defined in: [src/react/useGoogleDriveBackup.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L37)

Import a conversation from an encrypted blob

#### Parameters

##### blob

`Blob`

##### userAddress

`string`

#### Returns

`Promise`\<\{ `success`: `boolean`; \}\>

***

### requestDriveAccess()

> **requestDriveAccess**: () => `Promise`\<`string`\>

Defined in: [src/react/useGoogleDriveBackup.ts:28](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L28)

Request Google Drive access - returns access token

#### Returns

`Promise`\<`string`\>

***

### requestEncryptionKey()

> **requestEncryptionKey**: (`address`) => `Promise`\<`void`\>

Defined in: [src/react/useGoogleDriveBackup.ts:30](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L30)

Request encryption key for the user address

#### Parameters

##### address

`string`

#### Returns

`Promise`\<`void`\>

***

### rootFolder?

> `optional` **rootFolder**: `string`

Defined in: [src/react/useGoogleDriveBackup.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L42)

Root folder name in Google Drive (default: 'ai-chat-app')

***

### userAddress

> **userAddress**: `string` \| `null`

Defined in: [src/react/useGoogleDriveBackup.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L24)

Current user address (null if not signed in)
