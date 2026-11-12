# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:722](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#722)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:727](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#727)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### assistantMessageId?

> `optional` **assistantMessageId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:725](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#725)

The reply id the storage hook writes this turn's answer under, when it chose one.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:729](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#729)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:723](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#723)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:728](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#728)
