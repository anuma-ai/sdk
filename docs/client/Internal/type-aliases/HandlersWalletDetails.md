# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3616](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3616)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3620](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3620)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3621)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3625](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3625)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3629](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3629)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3633](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3633)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3637](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3637)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3641](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3641)

"basic", "starter", or "pro"
