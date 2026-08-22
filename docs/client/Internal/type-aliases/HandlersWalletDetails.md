# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3690)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3694](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3694)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3695](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3695)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3699](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3699)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3703)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3707)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3711)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3715)

"basic", "starter", or "pro"
