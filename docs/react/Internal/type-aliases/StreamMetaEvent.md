# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:643](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#643)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:644](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#644)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:646](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#646)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
