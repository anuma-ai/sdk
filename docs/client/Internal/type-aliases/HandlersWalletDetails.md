# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3111)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3115](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3115)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3116)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3120)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3124)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3128)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3132)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3136)

"basic", "starter", or "pro"
