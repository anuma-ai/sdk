# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:603](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#603)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:604](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#604)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:606](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#606)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
