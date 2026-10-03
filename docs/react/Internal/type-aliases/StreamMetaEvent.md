# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:807](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#807)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:808](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#808)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:810](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#810)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
