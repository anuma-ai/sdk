# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L83)

Arguments for sendMessage with storage (React version)

Extends base arguments with React-specific features like tools and headers.

## Extends

- `BaseSendMessageWithStorageArgs`

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L99)

#### Inherited from

`BaseSendMessageWithStorageArgs.content`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L104)

#### Inherited from

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/react/useChatStorage.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L88)

Custom headers

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L102)

#### Inherited from

`BaseSendMessageWithStorageArgs.includeHistory`

***

### maxHistoryMessages?

> `optional` **maxHistoryMessages**: `number`

Defined in: [src/lib/db/chat/types.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L103)

#### Inherited from

`BaseSendMessageWithStorageArgs.maxHistoryMessages`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L106)

#### Inherited from

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](../../client/type-aliases/LlmapiMessage.md)[]

Defined in: [src/lib/db/chat/types.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L101)

#### Inherited from

`BaseSendMessageWithStorageArgs.messages`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L100)

#### Inherited from

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/db/chat/types.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L105)

#### Parameters

##### chunk

`string`

#### Returns

`void`

#### Inherited from

`BaseSendMessageWithStorageArgs.onData`

***

### runTools?

> `optional` **runTools**: `boolean`

Defined in: [src/react/useChatStorage.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L86)

Whether to run tool selection
