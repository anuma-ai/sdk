# UseBackupOptions

Defined in: [src/react/useBackup.ts:32](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L32)

Options for useBackup hook

## Properties

### database

> **database**: `Database`

Defined in: [src/react/useBackup.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L34)

WatermelonDB database instance

***

### dropboxFolder?

> `optional` **dropboxFolder**: `string`

Defined in: [src/react/useBackup.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L50)

Dropbox folder path for backups (default: '/ai-chat-app/conversations')

***

### exportConversation()

> **exportConversation**: (`conversationId`, `userAddress`) => `Promise`\<\{ `blob?`: `Blob`; `success`: `boolean`; \}\>

Defined in: [src/react/useBackup.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L40)

Export a conversation to an encrypted blob

#### Parameters

##### conversationId

`string`

##### userAddress

`string`

#### Returns

`Promise`\<\{ `blob?`: `Blob`; `success`: `boolean`; \}\>

***

### googleConversationsFolder?

> `optional` **googleConversationsFolder**: `string`

Defined in: [src/react/useBackup.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L54)

Google Drive conversations subfolder (default: 'conversations')

***

### googleRootFolder?

> `optional` **googleRootFolder**: `string`

Defined in: [src/react/useBackup.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L52)

Google Drive root folder name (default: 'ai-chat-app')

***

### importConversation()

> **importConversation**: (`blob`, `userAddress`) => `Promise`\<\{ `success`: `boolean`; \}\>

Defined in: [src/react/useBackup.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L45)

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

Defined in: [src/react/useBackup.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L38)

Request encryption key for the user address

#### Parameters

##### address

`string`

#### Returns

`Promise`\<`void`\>

***

### userAddress

> **userAddress**: `string` \| `null`

Defined in: [src/react/useBackup.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L36)

Current user address (null if not signed in)
