# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:796](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#796)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:799](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#799)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:801](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#801)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:797](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#797)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:800](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#800)
