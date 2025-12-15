# UseChatStorageOptions

Defined in: [src/react/useChatStorage.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L66)

Options for useChatStorage hook (React version)

Extends base options with React-specific features like local chat and tools.

## Extends

- `BaseUseChatStorageOptions`

## Properties

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/chatStorage/types.ts:161](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L161)

Auto-create conversation if it doesn't exist (default: true)

#### Inherited from

`BaseUseChatStorageOptions.autoCreateConversation`

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/chatStorage/types.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L167)

Base URL for API requests

#### Inherited from

`BaseUseChatStorageOptions.baseUrl`

***

### chatProvider?

> `optional` **chatProvider**: `"local"` \| `"api"`

Defined in: [src/react/useChatStorage.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L68)

Chat provider: "api" or "local"

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chatStorage/types.ts:159](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L159)

Current conversation ID (will create new if not provided)

#### Inherited from

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/chatStorage/types.ts:157](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L157)

WatermelonDB database instance

#### Inherited from

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/chatStorage/types.ts:163](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L163)

Default title for auto-created conversations

#### Inherited from

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### getToken()?

> `optional` **getToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/lib/chatStorage/types.ts:165](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L165)

Authentication token getter

#### Returns

`Promise`\<`string` \| `null`\>

#### Inherited from

`BaseUseChatStorageOptions.getToken`

***

### localModel?

> `optional` **localModel**: `string`

Defined in: [src/react/useChatStorage.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L70)

Model for local chat

***

### onData()?

> `optional` **onData**: (`chunk`) => `void`

Defined in: [src/lib/chatStorage/types.ts:169](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L169)

Callback when data chunk is received

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

Defined in: [src/lib/chatStorage/types.ts:173](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L173)

Callback when an error occurs

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

Defined in: [src/lib/chatStorage/types.ts:171](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L171)

Callback when chat completion finishes

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

Defined in: [src/react/useChatStorage.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L76)

Callback when tool is executed

#### Parameters

##### result

[`ToolExecutionResult`](ToolExecutionResult.md)

#### Returns

`void`

***

### tools?

> `optional` **tools**: [`ClientTool`](ClientTool.md)[]

Defined in: [src/react/useChatStorage.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L72)

Client-side tools

***

### toolSelectorModel?

> `optional` **toolSelectorModel**: `string`

Defined in: [src/react/useChatStorage.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L74)

Tool selector model
