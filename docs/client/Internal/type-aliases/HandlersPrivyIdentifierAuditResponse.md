# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2199](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2199)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2203](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2203)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2207](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2207)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2211](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2211)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2215](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2215)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2219](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2219)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2223](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2223)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2227](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2227)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2231](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2231)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2235](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2235)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2239](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2239)

stored identifier differs from embedded (case-insensitive)
