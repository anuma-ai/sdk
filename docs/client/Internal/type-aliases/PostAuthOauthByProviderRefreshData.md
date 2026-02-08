# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2159](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2159)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2163](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2163)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2164](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2164)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2170](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2170)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2171](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2171)
