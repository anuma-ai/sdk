# createAssistantStream()

> **createAssistantStream**(`text`: `string`): `ReadableStream`<`AssistantStreamEvent`>

Defined in: [src/vercel/streams.ts:18](https://github.com/zeta-chain/ai-sdk/blob/main/src/vercel/streams.ts#L18)

Creates a `ReadableStream` that emits the sequence of events expected by
Vercel's `createUIMessageStreamResponse` helper for a successful assistant reply.

The stream emits `text-start`, an optional `text-delta` containing the
provided `text`, and finally `text-end`, allowing Portal completions to be
piped directly into UI components that consume the AI SDK stream contract.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `text` | `string` | The assistant response text returned by the Portal API. |

## Returns

`ReadableStream`<`AssistantStreamEvent`>

A stream ready to be passed to `createUIMessageStreamResponse`.
