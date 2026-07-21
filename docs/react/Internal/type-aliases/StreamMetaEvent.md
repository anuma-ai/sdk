# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:656](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#656)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:657](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#657)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:659](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#659)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
