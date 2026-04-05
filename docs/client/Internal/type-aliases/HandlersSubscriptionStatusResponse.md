# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:961](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#961)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#965)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#969)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#973)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#977)

"stripe" | "revenuecat" — tells the client how to manage subscription

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:981](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#981)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:985](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#985)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:989](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#989)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:993](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#993)

"none" | "active" | "canceling" | "past\_due" | "canceled"
