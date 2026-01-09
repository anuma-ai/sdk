# createMemoryContextSystemMessage()

> **createMemoryContextSystemMessage**(`memories`: [`StoredMemory`](../interfaces/StoredMemory.md) & { `similarity?`: `number`; }\[], `baseSystemPrompt?`: `string`): `string`

Defined in: [src/lib/memory/chat.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L63)

Create a system message that includes relevant memories

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `memories` | [`StoredMemory`](../interfaces/StoredMemory.md) & { `similarity?`: `number`; }\[] | Array of memories to include |
| `baseSystemPrompt?` | `string` | Optional base system prompt (memories will be prepended) |

## Returns

`string`

System message content with memories
