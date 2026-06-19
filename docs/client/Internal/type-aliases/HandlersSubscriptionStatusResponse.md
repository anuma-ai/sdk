# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2502](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2502)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2506](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2506)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2510)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2514](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2514)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2518)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2522)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2526)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2530](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2530)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2534](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2534)

"none" | "active" | "canceling" | "past\_due" | "canceled"
