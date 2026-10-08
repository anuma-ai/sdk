# StreamMetaEvent

> **StreamMetaEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:721](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#721)

Payload for RunToolLoopOptions.onStreamMeta.

## Properties

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:722](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#722)

***

### round

> **round**: `number`

Defined in: [src/lib/chat/toolLoop.ts:724](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#724)

0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round).
