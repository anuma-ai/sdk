# SendMessageWithStorageResult

> **SendMessageWithStorageResult** = { `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: `ApiResponse`; `error`: `null`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); } | { `assistantMessage?`: `undefined`; `data`: `ApiResponse`; `error`: `null`; `skipped`: `true`; `userMessage?`: `undefined`; } | { `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

Defined in: [src/react/useChatStorage.ts:323](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L323)

Result from sendMessage with storage (React version)
The `data` field contains the raw server response which includes `tools_checksum`.

## Type Declaration

{ `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: `ApiResponse`; `error`: `null`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); }

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

### data

> **data**: `ApiResponse`

### error

> **error**: `null`

### userMessage

> **userMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

{ `assistantMessage?`: `undefined`; `data`: `ApiResponse`; `error`: `null`; `skipped`: `true`; `userMessage?`: `undefined`; }

### assistantMessage?

> `optional` **assistantMessage**: `undefined`

### data

> **data**: `ApiResponse`

### error

> **error**: `null`

### skipped

> **skipped**: `true`

Indicates this was a skipStorage request - no messages were persisted

### userMessage?

> `optional` **userMessage**: `undefined`

{ `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

### assistantMessage?

> `optional` **assistantMessage**: `undefined`

### data

> **data**: `null`

### error

> **error**: `string`

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)
