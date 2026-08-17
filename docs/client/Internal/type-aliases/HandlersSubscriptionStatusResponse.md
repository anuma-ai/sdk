# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:3150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3150)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:3154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3154)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:3158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3158)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:3162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3162)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:3166](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3166)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:3170](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3170)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:3174](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3174)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:3178](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3178)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:3182](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3182)

"none" | "active" | "canceling" | "past\_due" | "canceled"
