# SendMessageWithStorageArgs

> **SendMessageWithStorageArgs** = `BaseSendMessageWithStorageArgs` & `object`

Defined in: [src/expo/useChatStorage.ts:454](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#454)

Arguments for sendMessage with storage (Expo version)

Uses the base arguments without React-specific features (no runTools).

## Type Declaration

### apiType?

> `optional` **apiType**: `ApiType`

Override the API type for this request only.
Useful when different models need different APIs.

**Default**

```ts
Uses the hook-level apiType or "responses"
```

### headers?

> `optional` **headers**: `Record`<`string`, `string`>

Custom HTTP headers to include with the API request (e.g. X-Privacy-Mode).

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../classes/PiiRedactor.md)

Per-request PII redaction override. Takes precedence over the hook-level
`piiRedaction` for this call only — e.g. `false` to disable redaction for a
single message, or a `PiiRedactor` instance to use your own.
