# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3468)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3472)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3473)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3477)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3481](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3481)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3485](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3485)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3489)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3493)

"basic", "starter", or "pro"
