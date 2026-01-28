# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:1268](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1268)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:1272](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1272)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1273](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1273)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1279](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1279)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:1280](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1280)
