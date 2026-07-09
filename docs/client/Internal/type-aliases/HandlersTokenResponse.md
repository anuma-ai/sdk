# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2647](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2647)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2648)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2652](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2652)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2656](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2656)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2660)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2664](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2664)

Usually "Bearer"
