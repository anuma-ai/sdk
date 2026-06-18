# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:634](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#634)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:635](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#635)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:637](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#637)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
