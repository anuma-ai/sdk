# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L93)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L97)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L101)

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L105)

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L109)

"none" | "active" | "canceling" | "past\_due" | "canceled"
