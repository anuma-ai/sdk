# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:556](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#556)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:560](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#560)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#564)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:568](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#568)

"month" | "year", only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:572](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#572)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:576](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#576)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:580](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#580)

tier user will switch to at period end

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:584](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#584)

"none" | "active" | "canceling" | "past\_due" | "canceled"
