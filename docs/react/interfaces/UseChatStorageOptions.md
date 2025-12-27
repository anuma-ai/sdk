# UseChatStorageOptions

Defined in: [src/react/useChatStorage.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L81)

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

Defined in: [src/react/useChatStorage.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L83)

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

Defined in: [src/react/useChatStorage.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L85)

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

Defined in: [src/react/useChatStorage.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L91)

Callback when tool is executed

#### Parameters

##### result

[`ToolExecutionResult`](ToolExecutionResult.md)

#### Returns

`void`

***

### requestEncryptionKey()?

> `optional` **requestEncryptionKey**: (`address`) => `Promise`\<`void`\>

Defined in: [src/lib/db/chat/types.ts:128](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L128)

Function to request encryption key (optional - encryption disabled if not provided)

#### Parameters

##### address

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BaseUseChatStorageOptions.requestEncryptionKey`

***

### signMessage()?

> `optional` **signMessage**: (`message`) => `Promise`\<`string`\>

Defined in: [src/lib/db/chat/types.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L130)

Function to sign message for migration (optional - required for migrating old encrypted data)

#### Parameters

##### message

`string`

#### Returns

`Promise`\<`string`\>

#### Inherited from

`BaseUseChatStorageOptions.signMessage`

***

### tools?

> `optional` **tools**: [`ClientTool`](ClientTool.md)[]

Defined in: [src/react/useChatStorage.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L87)

Client-side tools

***

### toolSelectorModel?

> `optional` **toolSelectorModel**: `string`

Defined in: [src/react/useChatStorage.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L89)

Tool selector model

***

### walletAddress?

> `optional` **walletAddress**: `string` \| `null`

Defined in: [src/lib/db/chat/types.ts:126](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L126)

Wallet address for encryption (optional - encryption disabled if not provided)

#### Inherited from

`BaseUseChatStorageOptions.walletAddress`
