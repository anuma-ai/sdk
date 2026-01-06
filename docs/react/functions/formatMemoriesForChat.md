# formatMemoriesForChat()

> **formatMemoriesForChat**(`memories`: [`StoredMemory`](../interfaces/StoredMemory.md) & \{ `similarity?`: `number`; \}[], `format`: `"compact"` \| `"detailed"`): `string`

Defined in: [src/lib/memory/chat.ts:9](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L9)

Format memories into a context string that can be included in chat messages

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `memories` | [`StoredMemory`](../interfaces/StoredMemory.md) & \{ `similarity?`: `number`; \}[] | `undefined` | Array of memories with similarity scores |
| `format` | `"compact"` \| `"detailed"` | `"compact"` | Format style: "compact" (key-value pairs) or "detailed" (includes evidence) |

## Returns

`string`

Formatted string ready to include in system/user message
