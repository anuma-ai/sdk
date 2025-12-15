# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L84)

Arguments for sendMessage with storage (React version)

Extends base arguments with React-specific features like tools and headers.

## Extends

- `BaseSendMessageWithStorageArgs`

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chatStorage/types.ts:181](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L181)

Message content to send

#### Inherited from

`BaseSendMessageWithStorageArgs.content`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/chatStorage/types.ts:191](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L191)

Attached files

#### Inherited from

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/react/useChatStorage.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L89)

Custom headers

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/chatStorage/types.ts:187](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L187)

Whether to include stored messages from conversation

#### Inherited from

`BaseSendMessageWithStorageArgs.includeHistory`

***

### maxHistoryMessages?

> `optional` **maxHistoryMessages**: `number`

Defined in: [src/lib/chatStorage/types.ts:189](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L189)

Maximum number of history messages to include (default: 50)

#### Inherited from

`BaseSendMessageWithStorageArgs.maxHistoryMessages`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/chatStorage/types.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L195)

Memory context to inject as system message (formatted memories from useMemoryStorage)

#### Inherited from

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](../../client/type-aliases/LlmapiMessage.md)[]

Defined in: [src/lib/chatStorage/types.ts:185](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L185)

Previous messages to include (if not using stored messages)

#### Inherited from

`BaseSendMessageWithStorageArgs.messages`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chatStorage/types.ts:183](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L183)

Model to use for the completion

#### Inherited from

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/chatStorage/types.ts:193](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L193)

Per-request data callback

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

Defined in: [src/react/useChatStorage.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L87)

Whether to run tool selection
