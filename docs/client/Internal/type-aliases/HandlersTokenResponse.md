# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:643](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#643)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:644](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#644)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#648)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:652](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#652)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:656](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#656)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#660)

Usually "Bearer"
