# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#830)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:834](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#834)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#835)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:839](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#839)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:843](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#843)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:847](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#847)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled

> **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:851](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#851)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#855)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#859)

When user became Pro subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:863](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#863)

"basic" or "pro"
