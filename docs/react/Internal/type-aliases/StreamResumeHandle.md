# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:639](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#639)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:642](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#642)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:644](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#644)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:640](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#640)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:643](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#643)
