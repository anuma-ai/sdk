# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:265](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L265)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:269](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L269)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:273](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L273)

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:277](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L277)

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:281](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L281)

"none" | "active" | "canceling" | "past\_due" | "canceled"
