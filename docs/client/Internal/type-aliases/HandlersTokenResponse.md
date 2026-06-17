# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2500](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2500)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2501)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2505](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2505)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2509](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2509)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2513](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2513)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2517)

Usually "Bearer"
