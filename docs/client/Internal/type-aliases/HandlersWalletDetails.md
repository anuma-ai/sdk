# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:3501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3501)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:3505](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3505)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3506](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3506)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3510)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:3514](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3514)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3518)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:3522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3522)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:3526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3526)

"basic", "starter", or "pro"
