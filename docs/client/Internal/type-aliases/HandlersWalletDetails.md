# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:2896](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2896)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:2900](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2900)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2901](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2901)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2905](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2905)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:2909](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2909)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2913](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2913)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2917](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2917)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:2921](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2921)

"basic", "starter", or "pro"
