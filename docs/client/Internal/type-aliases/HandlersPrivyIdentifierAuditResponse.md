# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2260)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2264)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2268](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2268)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2272](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2272)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2276](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2276)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2280](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2280)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2284](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2284)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2288)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2292)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2296](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2296)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2300)

stored identifier differs from embedded (case-insensitive)
