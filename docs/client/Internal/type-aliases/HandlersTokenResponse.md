# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:987](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#987)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:988](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#988)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:992](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#992)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:996](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#996)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:1000](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1000)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:1004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1004)

Usually "Bearer"
