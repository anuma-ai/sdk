# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3287](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3287)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3291)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3292)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3296](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3296)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3300)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3304](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3304)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3308)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3312](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3312)

"basic", "starter", or "pro"
