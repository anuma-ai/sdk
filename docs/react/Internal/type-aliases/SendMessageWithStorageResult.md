# SendMessageWithStorageResult

> **SendMessageWithStorageResult** = { `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `autoExecutedToolResults?`: `object`\[]; `data`: `ApiResponse`; `error`: `null`; `toolResultsMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); } | { `assistantMessage?`: `undefined`; `data`: `ApiResponse`; `error`: `null`; `skipped`: `true`; `userMessage?`: `undefined`; } | { `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

Defined in: [src/react/useChatStorage.ts:758](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#758)

Result from sendMessage with storage (React version)
The `data` field contains the raw server response which includes `tools_checksum`.

## Type Declaration

{ `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `autoExecutedToolResults?`: `object`\[]; `data`: `ApiResponse`; `error`: `null`; `toolResultsMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); }

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

### autoExecutedToolResults?

> `optional` **autoExecutedToolResults**: `object`\[]

Results from tools that were auto-executed by the SDK (e.g. display tools)

### data

> **data**: `ApiResponse`

### error

> **error**: `null`

### toolResultsMessage?

> `optional` **toolResultsMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

The synthetic `[Tool Execution Results]` row those results were persisted as, so a caller can
key its transient overlay on the id the SDK actually wrote instead of deriving one (#5519).
Absent when no tool ran, or when that (non-fatal) write failed.

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
