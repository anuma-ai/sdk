# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2709)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2713)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2717)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2721)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2725)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2729)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2733)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2737)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2741](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2741)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2745)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2749](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2749)

stored identifier differs from embedded (case-insensitive)
