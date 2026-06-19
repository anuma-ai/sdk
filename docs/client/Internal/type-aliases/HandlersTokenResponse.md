# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2537)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2538)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2542](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2542)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2546](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2546)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2550](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2550)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2554](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2554)

Usually "Bearer"
