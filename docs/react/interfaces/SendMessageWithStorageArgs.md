# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L88)

Arguments for sendMessage with storage (React version)

Extends base arguments with React-specific features like tools and headers.

## Extends

- `BaseSendMessageWithStorageArgs`

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L103)

#### Inherited from

`BaseSendMessageWithStorageArgs.content`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L108)

#### Inherited from

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/react/useChatStorage.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L93)

Custom headers

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L106)

#### Inherited from

`BaseSendMessageWithStorageArgs.includeHistory`

***

### maxHistoryMessages?

> `optional` **maxHistoryMessages**: `number`

Defined in: [src/lib/db/chat/types.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L107)

#### Inherited from

`BaseSendMessageWithStorageArgs.maxHistoryMessages`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L110)

#### Inherited from

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](../../client/type-aliases/LlmapiMessage.md)[]

Defined in: [src/lib/db/chat/types.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L105)

#### Inherited from

`BaseSendMessageWithStorageArgs.messages`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L104)

#### Inherited from

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/db/chat/types.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L109)

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

Defined in: [src/react/useChatStorage.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L91)

Whether to run tool selection

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L111)

#### Inherited from

`BaseSendMessageWithStorageArgs.searchContext`

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L112)

#### Inherited from

`BaseSendMessageWithStorageArgs.sources`
