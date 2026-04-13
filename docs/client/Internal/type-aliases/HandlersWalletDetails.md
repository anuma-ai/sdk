# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:1326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1326)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:1330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1330)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:1331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1331)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1335)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:1339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1339)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:1343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1343)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled

> **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:1347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1347)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:1351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1351)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:1355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1355)

When user became Pro subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1359)

"basic" or "pro"
