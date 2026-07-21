# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:651](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#651)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:652](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#652)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:654](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#654)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
