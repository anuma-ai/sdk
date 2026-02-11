# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:311](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L311)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:315](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L315)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:319](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L319)

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:323](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L323)

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:327](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L327)

"none" | "active" | "canceling" | "past\_due" | "canceled"
