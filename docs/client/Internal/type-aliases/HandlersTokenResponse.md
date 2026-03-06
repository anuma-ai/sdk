# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:685](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#685)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:686](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#686)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#690)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:694](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#694)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:698](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#698)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#702)

Usually "Bearer"
