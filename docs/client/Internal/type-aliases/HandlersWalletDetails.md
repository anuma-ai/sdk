# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3085)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3089)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3090)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3094)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3098)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3102](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3102)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3106)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3110)

"basic", "starter", or "pro"
