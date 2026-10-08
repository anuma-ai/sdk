# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:706](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#706)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:707](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#707)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:709](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#709)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
