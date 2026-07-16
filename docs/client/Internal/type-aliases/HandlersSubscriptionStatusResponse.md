# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2635](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2635)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2639](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2639)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2643](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2643)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2647](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2647)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2651](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2651)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2655](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2655)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2659](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2659)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2663)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2667](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2667)

"none" | "active" | "canceling" | "past\_due" | "canceled"
