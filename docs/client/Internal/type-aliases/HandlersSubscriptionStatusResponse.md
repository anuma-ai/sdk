# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:1248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1248)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:1252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1252)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:1256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1256)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:1260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1260)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:1264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1264)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:1268](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1268)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:1272](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1272)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:1276](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1276)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1280](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1280)

"none" | "active" | "canceling" | "past\_due" | "canceled"
