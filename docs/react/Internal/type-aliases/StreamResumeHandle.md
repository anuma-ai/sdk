# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:704](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#704)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:707](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#707)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:709](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#709)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#705)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:708](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#708)
