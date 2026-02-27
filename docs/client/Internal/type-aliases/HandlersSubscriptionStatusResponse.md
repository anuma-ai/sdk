# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#521)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:525](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#525)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#529)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#533)

"month" | "year", only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#537)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:541](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#541)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#545)

tier user will switch to at period end

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:549](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#549)

"none" | "active" | "canceling" | "past\_due" | "canceled"
