# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:713](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#713)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:716](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#716)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:718](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#718)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:714](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#714)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:717](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#717)
