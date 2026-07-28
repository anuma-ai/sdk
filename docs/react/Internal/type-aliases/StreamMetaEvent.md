# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:702](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#702)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:703](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#703)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#705)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
