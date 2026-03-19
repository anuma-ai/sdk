# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#739)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#743)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#747)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:751](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#751)

"month" | "year", only present if subscribed

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:755](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#755)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:759](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#759)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:763](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#763)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:767](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#767)

"none" | "active" | "canceling" | "past\_due" | "canceled"
