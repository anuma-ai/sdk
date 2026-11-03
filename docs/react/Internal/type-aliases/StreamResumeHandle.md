# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:716](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#716)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:721](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#721)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### assistantMessageId?

> `optional` **assistantMessageId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:719](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#719)

The reply id the storage hook writes this turn's answer under, when it chose one.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:723](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#723)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:717](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#717)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:722](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#722)
