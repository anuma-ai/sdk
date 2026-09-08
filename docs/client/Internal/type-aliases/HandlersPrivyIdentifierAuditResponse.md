# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2687](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2687)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2691)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2695](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2695)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2699](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2699)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2703)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2707)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2711)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2715)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2719](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2719)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2723)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2727](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2727)

stored identifier differs from embedded (case-insensitive)
