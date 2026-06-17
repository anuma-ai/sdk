# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:2873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2873)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:2877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2877)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2878)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2882)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:2886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2886)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2890)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2894](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2894)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:2898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2898)

"basic", "starter", or "pro"
