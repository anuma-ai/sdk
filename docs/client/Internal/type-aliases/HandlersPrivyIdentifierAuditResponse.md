# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2356)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2360)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2364)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2368](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2368)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2372)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2376](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2376)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2380)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2384)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2388)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2392)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2396)

stored identifier differs from embedded (case-insensitive)
