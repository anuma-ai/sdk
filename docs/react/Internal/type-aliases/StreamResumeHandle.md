# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:644](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#644)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:647](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#647)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:649](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#649)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:645](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#645)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:648](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#648)
