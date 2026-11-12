# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:736](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#736)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:737](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#737)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:739](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#739)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
