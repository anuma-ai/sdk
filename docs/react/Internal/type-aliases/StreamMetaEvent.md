# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:770](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#770)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:771](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#771)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:773](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#773)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
