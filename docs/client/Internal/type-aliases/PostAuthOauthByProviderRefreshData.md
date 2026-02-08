# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2102](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2102)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2106](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2106)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2107](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2107)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2113](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2113)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2114](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2114)
