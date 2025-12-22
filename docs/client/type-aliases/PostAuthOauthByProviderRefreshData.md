# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:1070](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1070)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:1074](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1074)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1075](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1075)

#### provider

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1081](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1081)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:1082](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1082)
