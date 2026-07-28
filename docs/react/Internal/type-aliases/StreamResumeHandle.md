# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:690](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#690)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:693](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#693)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:695](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#695)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:691](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#691)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:694](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#694)
