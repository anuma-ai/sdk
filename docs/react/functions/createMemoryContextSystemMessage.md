# createMemoryContextSystemMessage()

> **createMemoryContextSystemMessage**(`memories`, `baseSystemPrompt?`): `string`

Defined in: [lib/memory/chat.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L63)

Create a system message that includes relevant memories

## Parameters

### memories

`StoredMemoryItem` & `object`[]

Array of memories to include

### baseSystemPrompt?

`string`

Optional base system prompt (memories will be prepended)

## Returns

`string`

System message content with memories
