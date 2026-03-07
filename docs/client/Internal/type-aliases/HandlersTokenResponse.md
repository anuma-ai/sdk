# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:753](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#753)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:754](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#754)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:758](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#758)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#762)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#766)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#770)

Usually "Bearer"
