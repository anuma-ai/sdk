# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2289](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2289)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2293](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2293)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2297](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2297)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2301](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2301)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2305)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2309)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2313](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2313)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2317](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2317)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2321](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2321)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2325](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2325)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2329](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2329)

stored identifier differs from embedded (case-insensitive)
