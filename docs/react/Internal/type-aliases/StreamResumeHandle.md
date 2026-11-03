# StreamResumeHandle

> **StreamResumeHandle** = `object`

Defined in: [src/lib/chat/toolLoop.ts:728](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#728)

Everything resumeStream() needs to replay a detached stream.

## Properties

### apiType

> **apiType**: `Exclude`<`ApiType`, `"auto"`>

Defined in: [src/lib/chat/toolLoop.ts:733](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#733)

The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop.

***

### assistantMessageId?

> `optional` **assistantMessageId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:731](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#731)

The reply id the storage hook writes this turn's answer under, when it chose one.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:735](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#735)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/lib/chat/toolLoop.ts:729](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#729)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chat/toolLoop.ts:734](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#734)
