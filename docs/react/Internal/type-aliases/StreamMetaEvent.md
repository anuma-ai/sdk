# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:731](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#731)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:732](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#732)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:734](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#734)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
