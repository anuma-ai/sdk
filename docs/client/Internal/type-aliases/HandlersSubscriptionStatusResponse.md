# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:333](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L333)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:337](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L337)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:341](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L341)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:345](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L345)

"month" | "year", only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:349](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L349)

"free" | "starter" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:353](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L353)

"none" | "active" | "canceling" | "past\_due" | "canceled"
