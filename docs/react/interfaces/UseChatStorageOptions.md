# UseChatStorageOptions

Defined in: [src/react/useChatStorage.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L73)

Options for useChatStorage hook (React version)

Extends base options with React-specific features like local chat and tools.

## Extends

- `BaseUseChatStorageOptions`

## Properties

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:118](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L118)

#### Inherited from

`BaseUseChatStorageOptions.autoCreateConversation`

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:121](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L121)

#### Inherited from

`BaseUseChatStorageOptions.baseUrl`

***

### chatProvider?

> `optional` **chatProvider**: `"local"` \| `"api"`

Defined in: [src/react/useChatStorage.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L75)

Chat provider: "api" or "local"

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:117](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L117)

#### Inherited from

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:116](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L116)

#### Inherited from

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L119)

#### Inherited from

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### getToken()?

> `optional` **getToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/lib/db/chat/types.ts:120](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L120)

#### Returns

`Promise`\<`string` \| `null`\>

#### Inherited from

`BaseUseChatStorageOptions.getToken`

***

### localModel?

> `optional` **localModel**: `string`

Defined in: [src/react/useChatStorage.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L77)

Model for local chat

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/db/chat/types.ts:122](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L122)

#### Parameters

##### chunk

`string`

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageOptions.onData`

***

### onError()?

> `optional` **onError**: (`error`) => `void`

Defined in: [src/lib/db/chat/types.ts:124](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L124)

#### Parameters

##### error

`Error`

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageOptions.onError`

***

### onFinish()?

> `optional` **onFinish**: (`response`) => `void`

Defined in: [src/lib/db/chat/types.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L123)

#### Parameters

##### response

[`LlmapiChatCompletionResponse`](../../client/type-aliases/LlmapiChatCompletionResponse.md)

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageOptions.onFinish`

***

### onToolExecution()?

> `optional` **onToolExecution**: (`result`) => `void`

Defined in: [src/react/useChatStorage.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L83)

Callback when tool is executed

#### Parameters

##### result

[`ToolExecutionResult`](ToolExecutionResult.md)

#### Returns

`void`

***

### tools?

> `optional` **tools**: [`ClientTool`](ClientTool.md)[]

Defined in: [src/react/useChatStorage.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L79)

Client-side tools

***

### toolSelectorModel?

> `optional` **toolSelectorModel**: `string`

Defined in: [src/react/useChatStorage.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L81)

Tool selector model
