# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3133](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3133)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3137)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3138)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3142)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3146)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3150)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3154)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3158)

"basic", "starter", or "pro"
