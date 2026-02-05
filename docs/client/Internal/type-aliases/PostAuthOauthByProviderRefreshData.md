# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2163](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2163)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2167](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2167)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2168](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2168)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2174](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2174)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2175](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2175)
