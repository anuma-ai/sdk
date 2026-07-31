# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:718](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#718)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:719](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#719)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:721](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#721)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
