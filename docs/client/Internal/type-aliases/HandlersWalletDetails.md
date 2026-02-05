# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:330](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L330)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:334](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L334)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:335](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L335)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:339](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L339)

When balance was last synced from chain

***

### cached\_balance\_usd?

> `optional` **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:343](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L343)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:347](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L347)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled?

> `optional` **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:351](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L351)

Whether enrolled in cost-limit model

***

### last\_credit\_reset\_at?

> `optional` **last\_credit\_reset\_at**: `string`

Defined in: [src/client/types.gen.ts:355](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L355)

Last credit reset timestamp

***

### pending\_cost\_usd?

> `optional` **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:359](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L359)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:363](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L363)

When user became Pro subscriber

***

### subscription\_tier?

> `optional` **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:367](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L367)

"basic" or "pro"
