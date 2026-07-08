# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2279](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2279)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2283)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2287](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2287)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2291)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2295)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2299](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2299)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2303)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2307)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2311)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2315)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2319)

stored identifier differs from embedded (case-insensitive)
