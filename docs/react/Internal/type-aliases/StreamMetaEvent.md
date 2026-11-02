# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:740](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#740)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:741](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#741)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:743](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#743)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
