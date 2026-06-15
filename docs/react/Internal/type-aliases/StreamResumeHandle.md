# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:622](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#622)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:625](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#625)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:627](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#627)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:623](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#623)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:626](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#626)
