# MediaSeedResult

Defined in: [src/lib/chatStore/media.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#83)

## Properties

### deferred

> **deferred**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#90)

Local ids another run may still be uploading; rerun after 16 minutes.

***

### deleted

> **deleted**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#86)

Local ids of items deleted on another device.

***

### missing

> **missing**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#87)

***

### oversized

> **oversized**: `string`\[]

Defined in: [src/lib/chatStore/media.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#88)

***

### remaining

> **remaining**: `number`

Defined in: [src/lib/chatStore/media.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#92)

Items left for the next run after `maxUploads` was reached.

***

### uploaded

> **uploaded**: `number`

Defined in: [src/lib/chatStore/media.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#84)
