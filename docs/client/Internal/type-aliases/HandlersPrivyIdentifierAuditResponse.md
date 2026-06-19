# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2213)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2217](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2217)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2221](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2221)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2225](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2225)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2229](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2229)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2233)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2237)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2241](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2241)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2245](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2245)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2249](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2249)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2253](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2253)

stored identifier differs from embedded (case-insensitive)
