# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2382](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2382)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2386](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2386)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2387](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2387)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2393](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2393)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2394](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2394)
