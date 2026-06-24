# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2228](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2228)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2232](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2232)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2236)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2240](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2240)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2244](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2244)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2248)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2252)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2256)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2260)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2264)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2268](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2268)

stored identifier differs from embedded (case-insensitive)
