# HandlersTokenResponse

> **HandlersTokenResponse** = \{ `access_token?`: `string`; `expires_in?`: `number`; `refresh_token?`: `string`; `scope?`: `string`; `token_type?`: `string`; \}

Defined in: [src/client/types.gen.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L103)

## Properties

### access\_token?

> `optional` **access\_token**: `string`

Defined in: [src/client/types.gen.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L104)

***

### expires\_in?

> `optional` **expires\_in**: `number`

Defined in: [src/client/types.gen.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L108)

Seconds until expiration

***

### refresh\_token?

> `optional` **refresh\_token**: `string`

Defined in: [src/client/types.gen.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L112)

May not be present on refresh

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/client/types.gen.ts:116](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L116)

Granted scopes

***

### token\_type?

> `optional` **token\_type**: `string`

Defined in: [src/client/types.gen.ts:120](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L120)

Usually "Bearer"
