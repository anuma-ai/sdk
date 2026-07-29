# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3141)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3145](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3145)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3146)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3150)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3154)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3158)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3162)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3166](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3166)

"basic", "starter", or "pro"
