# SendMessageWithStorageResult

> **SendMessageWithStorageResult** = { `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md); `error`: `null`; `toolsChecksum?`: `string`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); } | { `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `toolsChecksum?`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

Defined in: [src/react/useChatStorage.ts:416](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L416)

Result from sendMessage with storage (React version)

## Type Declaration

{ `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md); `error`: `null`; `toolsChecksum?`: `string`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); }

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

### data

> **data**: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md)

### error

> **error**: `null`

### toolsChecksum?

> `optional` **toolsChecksum**: `string`

Checksum of tools used to generate this response

### userMessage

> **userMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

{ `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `toolsChecksum?`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

### assistantMessage?

> `optional` **assistantMessage**: `undefined`

### data

> **data**: `null`

### error

> **error**: `string`

### toolsChecksum?

> `optional` **toolsChecksum**: `string`

Checksum of tools used to generate this response

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)
