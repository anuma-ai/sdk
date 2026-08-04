# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2745)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2746)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2750](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2750)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2754](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2754)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2758](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2758)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2762)

Usually "Bearer"
