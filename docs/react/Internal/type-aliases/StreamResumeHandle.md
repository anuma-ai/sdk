# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:795](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#795)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:798](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#798)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:800](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#800)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:796](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#796)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:799](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#799)
