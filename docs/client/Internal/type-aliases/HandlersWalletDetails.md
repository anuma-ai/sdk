# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3030)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3034](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3034)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3035)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3039](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3039)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3043](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3043)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3047](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3047)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3051)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3055](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3055)

"basic", "starter", or "pro"
