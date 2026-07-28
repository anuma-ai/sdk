# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:690](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#690)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:691](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#691)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:693](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#693)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
