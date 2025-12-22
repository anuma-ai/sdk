# UseChatStorageOptions

Defined in: [src/react/useChatStorage.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L70)

Options for useChatStorage hook (React version)

Extends base options with React-specific features like local chat and tools.

## Extends

- `BaseUseChatStorageOptions`

## Properties

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L93)

#### Inherited from

`BaseUseChatStorageOptions.autoCreateConversation`

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L96)

#### Inherited from

`BaseUseChatStorageOptions.baseUrl`

***

### chatProvider?

> `optional` **chatProvider**: `"local"` \| `"api"`

Defined in: [src/react/useChatStorage.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L72)

Chat provider: "api" or "local"

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L92)

#### Inherited from

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L91)

#### Inherited from

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L94)

#### Inherited from

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### getToken()?

> `optional` **getToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/lib/db/chat/types.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L95)

#### Returns

`Promise`\<`string` \| `null`\>

#### Inherited from

`BaseUseChatStorageOptions.getToken`

***

### localModel?

> `optional` **localModel**: `string`

Defined in: [src/react/useChatStorage.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L74)

Model for local chat

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/db/chat/types.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L97)

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

Defined in: [src/lib/db/chat/types.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L99)

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

Defined in: [src/lib/db/chat/types.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L98)

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

Defined in: [src/react/useChatStorage.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L80)

Callback when tool is executed

#### Parameters

##### result

[`ToolExecutionResult`](ToolExecutionResult.md)

#### Returns

`void`

***

### tools?

> `optional` **tools**: [`ClientTool`](ClientTool.md)[]

Defined in: [src/react/useChatStorage.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L76)

Client-side tools

***

### toolSelectorModel?

> `optional` **toolSelectorModel**: `string`

Defined in: [src/react/useChatStorage.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L78)

Tool selector model
