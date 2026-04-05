# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:1017](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1017)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:1018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1018)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:1022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1022)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:1026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1026)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:1030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1030)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:1034](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1034)

Usually "Bearer"
