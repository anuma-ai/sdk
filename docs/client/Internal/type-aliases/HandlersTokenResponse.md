# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2610)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2611](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2611)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2615](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2615)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2619)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2623](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2623)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2627](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2627)

Usually "Bearer"
