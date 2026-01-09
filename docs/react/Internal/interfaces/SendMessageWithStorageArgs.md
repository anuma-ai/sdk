# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L91)

Arguments for sendMessage with storage (React version)

Extends base arguments with headers and apiType support.

## Extends

* `BaseSendMessageWithStorageArgs`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/react/useChatStorage.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L99)

Override the API type for this request only.
Useful when different models need different APIs.

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:149](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L149)

**Inherited from**

`BaseSendMessageWithStorageArgs.content`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L154)

**Inherited from**

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`<`string`, `string`>

Defined in: [src/react/useChatStorage.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L94)

Custom headers

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:152](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L152)

**Inherited from**

`BaseSendMessageWithStorageArgs.includeHistory`

***

### maxHistoryMessages?

> `optional` **maxHistoryMessages**: `number`

Defined in: [src/lib/db/chat/types.ts:153](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L153)

**Inherited from**

`BaseSendMessageWithStorageArgs.maxHistoryMessages`

***

### maxOutputTokens?

> `optional` **maxOutputTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:182](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L182)

Maximum number of tokens to generate in the response.

**Inherited from**

`BaseSendMessageWithStorageArgs.maxOutputTokens`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L156)

**Inherited from**

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/db/chat/types.ts:151](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L151)

**Inherited from**

`BaseSendMessageWithStorageArgs.messages`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:150](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L150)

**Inherited from**

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L155)

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

`BaseSendMessageWithStorageArgs.onData`

***

### onThinking()?

> `optional` **onThinking**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:205](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L205)

Per-request callback for thinking/reasoning chunks.
Called with delta chunks as the model "thinks" through a problem.

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

`BaseSendMessageWithStorageArgs.onThinking`

***

### previousResponseId?

> `optional` **previousResponseId**: `string`

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L170)

ID of a previous response to continue from.
Enables multi-turn conversations without resending full history.

**Inherited from**

`BaseSendMessageWithStorageArgs.previousResponseId`

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md)

Defined in: [src/lib/db/chat/types.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L195)

Reasoning configuration for o-series and other reasoning models.
Controls reasoning effort and summary output.

**Inherited from**

`BaseSendMessageWithStorageArgs.reasoning`

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:157](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L157)

**Inherited from**

`BaseSendMessageWithStorageArgs.searchContext`

***

### serverConversation?

> `optional` **serverConversation**: `string`

Defined in: [src/lib/db/chat/types.ts:174](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L174)

Conversation ID for grouping related responses on the server.

**Inherited from**

`BaseSendMessageWithStorageArgs.serverConversation`

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L158)

**Inherited from**

`BaseSendMessageWithStorageArgs.sources`

***

### store?

> `optional` **store**: `boolean`

Defined in: [src/lib/db/chat/types.ts:165](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L165)

Whether to store the response server-side.
When true, the response can be retrieved later using the response ID.

**Inherited from**

`BaseSendMessageWithStorageArgs.store`

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/lib/db/chat/types.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L178)

Controls randomness in the response (0.0 to 2.0).

**Inherited from**

`BaseSendMessageWithStorageArgs.temperature`

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md)

Defined in: [src/lib/db/chat/types.ts:200](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L200)

Extended thinking configuration for Anthropic models (Claude).
Enables the model to think through complex problems step by step.

**Inherited from**

`BaseSendMessageWithStorageArgs.thinking`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:159](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L159)

**Inherited from**

`BaseSendMessageWithStorageArgs.thoughtProcess`

***

### toolChoice?

> `optional` **toolChoice**: `string`

Defined in: [src/lib/db/chat/types.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L190)

Controls which tool to use: "auto", "any", "none", "required", or a specific tool name.

**Inherited from**

`BaseSendMessageWithStorageArgs.toolChoice`

***

### tools?

> `optional` **tools**: [`LlmapiTool`](../../../client/Internal/type-aliases/LlmapiTool.md)\[]

Defined in: [src/lib/db/chat/types.ts:186](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L186)

Array of tool definitions available to the model.

**Inherited from**

`BaseSendMessageWithStorageArgs.tools`

***

### writeFile()?

> `optional` **writeFile**: (`fileId`: `string`, `blob`: `Blob`, `options?`: `object`) => `Promise`<`string`>

Defined in: [src/react/useChatStorage.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L101)

Function to write files to storage (for MCP image processing). Optional - if not provided, MCP images won't be processed.

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

`fileId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`blob`

</td>
<td>

`Blob`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.onProgress?`

</td>
<td>

(`progress`: `number`) => `void`

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>
