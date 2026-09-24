# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:725](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#725)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:726](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#726)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:728](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#728)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
