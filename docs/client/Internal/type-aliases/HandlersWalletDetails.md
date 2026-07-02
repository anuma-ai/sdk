# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:2993](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2993)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:2997](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2997)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2998](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2998)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3002](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3002)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3006](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3006)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3010](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3010)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3014](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3014)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3018)

"basic", "starter", or "pro"
