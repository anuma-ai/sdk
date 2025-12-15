# createErrorStream()

> **createErrorStream**(`errorText`): `ReadableStream`\<`AssistantStreamEvent`\>

Defined in: [src/vercel/streams.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/vercel/streams.ts#L56)

Creates a `ReadableStream` that emits a single `error` event compatible
with the Vercel AI stream contract. This allows Portal API errors to be
surfaced directly in UI components that expect streamed assistant output.

## Parameters

### errorText

`string`

A human-readable error message to display in the UI.

## Returns

`ReadableStream`\<`AssistantStreamEvent`\>

A stream that, when consumed, immediately emits the error event.
