# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:649](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#649)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:652](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#652)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:654](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#654)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:650](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#650)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:653](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#653)
