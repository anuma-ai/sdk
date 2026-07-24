# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:661](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#661)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:662](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#662)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:664](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#664)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
