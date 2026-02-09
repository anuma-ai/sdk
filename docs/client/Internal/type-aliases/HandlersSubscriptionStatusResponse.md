# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:319](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L319)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:323](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L323)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:327](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L327)

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:331](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L331)

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:335](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L335)

"none" | "active" | "canceling" | "past\_due" | "canceled"
