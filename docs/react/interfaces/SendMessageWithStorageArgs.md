# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L99)

Arguments for sendMessage with storage (React version)

Extends base arguments with React-specific features like tools and headers.

## Extends

- `BaseSendMessageWithStorageArgs`

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L134)

#### Inherited from

`BaseSendMessageWithStorageArgs.content`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:139](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L139)

#### Inherited from

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/react/useChatStorage.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L104)

Custom headers

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L137)

#### Inherited from

`BaseSendMessageWithStorageArgs.includeHistory`

***

### maxHistoryMessages?

> `optional` **maxHistoryMessages**: `number`

Defined in: [src/lib/db/chat/types.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L138)

#### Inherited from

`BaseSendMessageWithStorageArgs.maxHistoryMessages`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:141](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L141)

#### Inherited from

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](../../client/type-aliases/LlmapiMessage.md)[]

Defined in: [src/lib/db/chat/types.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L136)

#### Inherited from

`BaseSendMessageWithStorageArgs.messages`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L135)

#### Inherited from

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/db/chat/types.ts:140](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L140)

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

Defined in: [src/react/useChatStorage.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L102)

Whether to run tool selection

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L142)

#### Inherited from

`BaseSendMessageWithStorageArgs.searchContext`

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:143](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L143)

#### Inherited from

`BaseSendMessageWithStorageArgs.sources`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`[]

Defined in: [src/lib/db/chat/types.ts:144](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L144)

#### Inherited from

`BaseSendMessageWithStorageArgs.thoughtProcess`
