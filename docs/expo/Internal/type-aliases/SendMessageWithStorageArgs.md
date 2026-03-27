# SendMessageWithStorageArgs

> **SendMessageWithStorageArgs** = `BaseSendMessageWithStorageArgs` & `object`

Defined in: [src/expo/useChatStorage.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#245)

Arguments for sendMessage with storage (Expo version)

Uses the base arguments without React-specific features (no runTools, no headers).

## Type Declaration

### apiType?

> `optional` **apiType**: `ApiType`

Override the API type for this request only.
Useful when different models need different APIs.

**Default**

```ts
Uses the hook-level apiType or "responses"
```
