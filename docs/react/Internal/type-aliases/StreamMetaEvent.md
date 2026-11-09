# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:732](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#732)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:733](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#733)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:735](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#735)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
