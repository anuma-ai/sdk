# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:718](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#718)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:723](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#723)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### assistantMessageId?

> `optional` **assistantMessageId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:721](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#721)

The reply id the storage hook writes this turn's answer under, when it chose one.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:725](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#725)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:719](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#719)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:724](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#724)
