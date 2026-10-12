# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:702](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#702)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#705)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:707](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#707)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:703](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#703)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:706](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#706)
