# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3080)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3084](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3084)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3085)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3089)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3093](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3093)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3097](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3097)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3101](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3101)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3105)

"basic", "starter", or "pro"
