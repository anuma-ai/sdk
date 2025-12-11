# mapMessagesToCompletionPayload()

> **mapMessagesToCompletionPayload**(`messages`): [`LlmapiMessage`](../../client/type-aliases/LlmapiMessage.md)[]

Defined in: [vercel/messages.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/vercel/messages.ts#L15)

Converts an array of Vercel AI UIMessage objects into the
`LlmapiMessage` format that the Portal API expects.

- Non text-only parts and unsupported roles are ignored.
- Text parts are merged with double newlines, matching the structure that
  `postApiV1ChatCompletions` accepts.

## Parameters

### messages

`UIMessage`\<`unknown`, `UIDataTypes`, `UITools`\>[]

The UI layer conversation history received from `createUIMessageStreamResponse`.

## Returns

[`LlmapiMessage`](../../client/type-aliases/LlmapiMessage.md)[]

A clean array of Portal-ready messages, filtered to user, assistant, and system roles.
