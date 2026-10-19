# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:727](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#727)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:730](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#730)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:732](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#732)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:728](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#728)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:731](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#731)
