# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2552](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2552)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2553)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2557](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2557)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2561)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2565](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2565)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2569](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2569)

Usually "Bearer"
