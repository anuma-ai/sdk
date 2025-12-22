# postApiV1Responses()

> **postApiV1Responses**\<`ThrowOnError`\>(`options`): `RequestResult`\<[`PostApiV1ResponsesResponses`](../type-aliases/PostApiV1ResponsesResponses.md), [`PostApiV1ResponsesErrors`](../type-aliases/PostApiV1ResponsesErrors.md), `ThrowOnError`\>

Defined in: [src/client/sdk.gen.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L110)

Create response

Generates a response using the Responses API format. Supports streaming when stream=true.

## Type Parameters

### ThrowOnError

`ThrowOnError` *extends* `boolean` = `false`

## Parameters

### options

[`Options`](../type-aliases/Options.md)\<[`PostApiV1ResponsesData`](../type-aliases/PostApiV1ResponsesData.md), `ThrowOnError`\>

## Returns

`RequestResult`\<[`PostApiV1ResponsesResponses`](../type-aliases/PostApiV1ResponsesResponses.md), [`PostApiV1ResponsesErrors`](../type-aliases/PostApiV1ResponsesErrors.md), `ThrowOnError`\>
