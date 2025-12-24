# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L80)

Arguments for sendMessage with storage (React version)

Extends base arguments with headers support.

## Extends

- `BaseSendMessageWithStorageArgs`

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:129](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L129)

#### Inherited from

`BaseSendMessageWithStorageArgs.content`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L134)

#### Inherited from

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/react/useChatStorage.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L83)

Custom headers

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:132](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L132)

#### Inherited from

`BaseSendMessageWithStorageArgs.includeHistory`

***

### maxHistoryMessages?

> `optional` **maxHistoryMessages**: `number`

Defined in: [src/lib/db/chat/types.ts:133](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L133)

#### Inherited from

`BaseSendMessageWithStorageArgs.maxHistoryMessages`

***

### maxOutputTokens?

> `optional` **maxOutputTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L162)

Maximum number of tokens to generate in the response.

#### Inherited from

`BaseSendMessageWithStorageArgs.maxOutputTokens`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L136)

#### Inherited from

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](../../client/type-aliases/LlmapiMessage.md)[]

Defined in: [src/lib/db/chat/types.ts:131](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L131)

#### Inherited from

`BaseSendMessageWithStorageArgs.messages`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L130)

#### Inherited from

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/db/chat/types.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L135)

#### Parameters

##### chunk

`string`

#### Returns

`void`

#### Inherited from

`BaseSendMessageWithStorageArgs.onData`

***

### previousResponseId?

> `optional` **previousResponseId**: `string`

Defined in: [src/lib/db/chat/types.ts:150](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L150)

ID of a previous response to continue from.
Enables multi-turn conversations without resending full history.

#### Inherited from

`BaseSendMessageWithStorageArgs.previousResponseId`

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L137)

#### Inherited from

`BaseSendMessageWithStorageArgs.searchContext`

***

### serverConversation?

> `optional` **serverConversation**: `string`

Defined in: [src/lib/db/chat/types.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L154)

Conversation ID for grouping related responses on the server.

#### Inherited from

`BaseSendMessageWithStorageArgs.serverConversation`

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L138)

#### Inherited from

`BaseSendMessageWithStorageArgs.sources`

***

### store?

> `optional` **store**: `boolean`

Defined in: [src/lib/db/chat/types.ts:145](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L145)

Whether to store the response server-side.
When true, the response can be retrieved later using the response ID.

#### Inherited from

`BaseSendMessageWithStorageArgs.store`

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L158)

Controls randomness in the response (0.0 to 2.0).

#### Inherited from

`BaseSendMessageWithStorageArgs.temperature`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`[]

Defined in: [src/lib/db/chat/types.ts:139](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L139)

#### Inherited from

`BaseSendMessageWithStorageArgs.thoughtProcess`

***

### toolChoice?

> `optional` **toolChoice**: `string`

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L170)

Controls which tool to use: "auto", "any", "none", "required", or a specific tool name.

#### Inherited from

`BaseSendMessageWithStorageArgs.toolChoice`

***

### tools?

> `optional` **tools**: [`LlmapiTool`](../../client/type-aliases/LlmapiTool.md)[]

Defined in: [src/lib/db/chat/types.ts:166](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L166)

Array of tool definitions available to the model.

#### Inherited from

`BaseSendMessageWithStorageArgs.tools`
