# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:714](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#714)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:715](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#715)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:717](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#717)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
