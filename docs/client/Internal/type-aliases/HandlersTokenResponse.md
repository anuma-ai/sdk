# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2598](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2598)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2599)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2603](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2603)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2607](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2607)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2611](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2611)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2615](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2615)

Usually "Bearer"
