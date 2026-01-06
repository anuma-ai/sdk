# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:1236](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1236)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:1240](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1240)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1241](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1241)

#### provider

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1247](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1247)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:1248](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1248)
