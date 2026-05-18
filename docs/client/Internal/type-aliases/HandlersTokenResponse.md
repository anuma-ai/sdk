# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:1283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1283)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:1284](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1284)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:1288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1288)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:1292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1292)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:1296](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1296)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:1300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1300)

Usually "Bearer"
