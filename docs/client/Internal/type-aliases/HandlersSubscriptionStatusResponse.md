# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:174](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L174)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L178)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:182](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L182)

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:186](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L186)

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L190)

"none" | "active" | "canceling" | "past\_due" | "canceled"
