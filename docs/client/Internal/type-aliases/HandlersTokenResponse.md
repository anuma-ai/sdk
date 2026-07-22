# HandlersTokenResponse

> **HandlersTokenResponse** = `object`

Defined in: [src/client/types.gen.ts:2702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2702)

## Properties

### access\_token

> **access\_token**: `string`

Defined in: [src/client/types.gen.ts:2703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2703)

***

### expires\_in

> **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:2707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2707)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:2711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2711)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:2715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2715)

Granted scopes

***

### token\_type

> **token\_type**: `string`

Defined in: [src/client/types.gen.ts:2719](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2719)

Usually "Bearer"
