# UseChatStorageOptions

> **UseChatStorageOptions** = `BaseUseChatStorageOptions` & { `apiType?`: `ApiType`; }

Defined in: [src/react/useChatStorage.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L75)

Options for useChatStorage hook (React version)

Extends base options with apiType support.

## Type Declaration

### apiType?

> `optional` **apiType**: `ApiType`

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)
