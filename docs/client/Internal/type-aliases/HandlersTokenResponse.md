# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2618)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2619)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2623](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2623)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2627](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2627)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2631](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2631)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2635](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2635)

Usually "Bearer"
