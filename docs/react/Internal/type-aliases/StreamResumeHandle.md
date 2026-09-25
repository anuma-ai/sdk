# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:758](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#758)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:761](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#761)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:763](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#763)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:759](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#759)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:762](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#762)
