# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:791](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#791)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#792)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:796](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#796)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#800)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#804)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:808](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#808)

Usually "Bearer"
