# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:397](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L397)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:401](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L401)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:402](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L402)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:406](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L406)

When balance was last synced from chain

***

### cached\_balance\_usd?

> `optional` **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:410](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L410)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:414](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L414)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled?

> `optional` **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:418](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L418)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd?

> `optional` **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:422](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L422)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:426](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L426)

When user became Pro subscriber

***

### subscription\_tier?

> `optional` **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:430](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L430)

"basic" or "pro"
