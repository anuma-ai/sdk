# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2704](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2704)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2708](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2708)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2712](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2712)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2716](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2716)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2720](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2720)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2724](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2724)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2728)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2732](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2732)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2736](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2736)

"none" | "active" | "canceling" | "past\_due" | "canceled"
