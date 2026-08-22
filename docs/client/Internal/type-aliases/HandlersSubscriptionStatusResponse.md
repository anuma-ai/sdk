# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:3224](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3224)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:3228](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3228)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:3232](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3232)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:3236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3236)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:3240](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3240)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:3244](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3244)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:3248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3248)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:3252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3252)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:3256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3256)

"none" | "active" | "canceling" | "past\_due" | "canceled"
