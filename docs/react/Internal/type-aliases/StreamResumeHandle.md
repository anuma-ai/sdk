# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:631](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#631)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:634](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#634)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:636](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#636)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:632](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#632)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:635](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#635)
