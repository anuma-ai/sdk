# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:268](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L268)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:272](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L272)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:276](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L276)

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:280](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L280)

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:284](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L284)

"none" | "active" | "canceling" | "past\_due" | "canceled"
