# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2850](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2850)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2854](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2854)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2858](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2858)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2862](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2862)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2866)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2870](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2870)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2874)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2878)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2882)

"none" | "active" | "canceling" | "past\_due" | "canceled"
