# UseChatStorageOptions

Defined in: src/react/useChatStorage.ts:176

Options for useChatStorage hook (React version)

Extends base options with apiType support.

## Extends

* `BaseUseChatStorageOptions`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: src/react/useChatStorage.ts:182

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

***

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: src/lib/db/chat/types.ts:159

Automatically create a new conversation if none is set (default: true)

**Inherited from**

`BaseUseChatStorageOptions.autoCreateConversation`

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: src/lib/db/chat/types.ts:165

Base URL for the chat API endpoint

**Inherited from**

`BaseUseChatStorageOptions.baseUrl`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: src/lib/db/chat/types.ts:157

ID of an existing conversation to load and continue

**Inherited from**

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: src/lib/db/chat/types.ts:155

WatermelonDB database instance for storing conversations and messages

**Inherited from**

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: src/lib/db/chat/types.ts:161

Title for auto-created conversations (default: "New conversation")

**Inherited from**

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: src/lib/db/chat/types.ts:163

Function to retrieve the auth token for API requests

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseChatStorageOptions.getToken`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: src/lib/db/chat/types.ts:167

Callback invoked with each streamed response chunk

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`chunk`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onData`

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: src/lib/db/chat/types.ts:171

Callback invoked when an error occurs during the request

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onError`

***

### onFinish()?

> `optional` **onFinish**: (`response`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void`

Defined in: src/lib/db/chat/types.ts:169

Callback invoked when the response completes successfully

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`response`

</td>
<td>

[`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onFinish`
