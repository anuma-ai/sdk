# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:713](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#713)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:714](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#714)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:716](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#716)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
