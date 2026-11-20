# MediaSeedResult

Defined in: [src/lib/chatStore/media.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#89)

## Properties

### deferred

> **deferred**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#96)

Local ids another run may still be uploading; rerun after 16 minutes.

***

### deleted

> **deleted**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#92)

Local ids of items deleted on another device.

***

### missing

> **missing**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#93)

***

### oversized

> **oversized**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#94)

***

### remaining

> **remaining**: `number`

Defined in: [src/lib/chatStore/media.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#98)

Items left for the next run after `maxUploads` was reached.

***

### uploaded

> **uploaded**: `number`

Defined in: [src/lib/chatStore/media.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#90)
