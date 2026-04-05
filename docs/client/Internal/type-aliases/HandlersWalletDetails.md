# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:1333](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1333)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:1337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1337)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:1338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1338)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1342)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:1346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1346)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:1350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1350)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled

> **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:1354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1354)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:1358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1358)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:1362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1362)

When user became Pro subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1366)

"basic" or "pro"
