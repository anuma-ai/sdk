# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:742](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#742)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:743](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#743)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:745](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#745)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
