# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:591](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#591)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:594](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#594)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:596](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#596)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:592](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#592)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:595](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#595)
