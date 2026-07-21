# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2331)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2335)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2339)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2343)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2347)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2351)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2355)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2359)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2363)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2367](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2367)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2371](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2371)

stored identifier differs from embedded (case-insensitive)
