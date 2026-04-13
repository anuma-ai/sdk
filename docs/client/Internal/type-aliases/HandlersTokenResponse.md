# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:1011](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1011)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:1012](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1012)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:1016](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1016)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:1020](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1020)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:1024](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1024)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:1028](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1028)

Usually "Bearer"
