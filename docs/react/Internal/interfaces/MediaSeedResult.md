# MediaSeedResult

Defined in: [src/lib/chatStore/media.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#88)

## Properties

### deferred

> **deferred**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#95)

Local ids another run may still be uploading; rerun after 16 minutes.

***

### deleted

> **deleted**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#91)

Local ids of items deleted on another device.

***

### missing

> **missing**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#92)

***

### oversized

> **oversized**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#93)

***

### remaining

> **remaining**: `number`

Defined in: [src/lib/chatStore/media.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#97)

Items left for the next run after `maxUploads` was reached.

***

### uploaded

> **uploaded**: `number`

Defined in: [src/lib/chatStore/media.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#89)
