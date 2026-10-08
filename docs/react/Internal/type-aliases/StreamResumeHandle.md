# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:701](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#701)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:704](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#704)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:706](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#706)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:702](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#702)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#705)
