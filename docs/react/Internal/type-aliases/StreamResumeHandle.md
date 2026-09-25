# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:761](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#761)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:764](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#764)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:766](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#766)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:762](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#762)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:765](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#765)
