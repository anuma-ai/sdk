# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:773](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#773)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:774](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#774)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:776](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#776)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
