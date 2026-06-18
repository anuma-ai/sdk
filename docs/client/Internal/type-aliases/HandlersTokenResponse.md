# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2523](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2523)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2524](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2524)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2528](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2528)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2532)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2536](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2536)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2540)

Usually "Bearer"
