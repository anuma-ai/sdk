# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:730](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#730)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:731](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#731)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:733](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#733)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
