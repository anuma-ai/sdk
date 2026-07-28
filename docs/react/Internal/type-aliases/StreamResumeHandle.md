# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:678](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#678)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:681](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#681)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:683](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#683)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:679](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#679)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:682](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#682)
