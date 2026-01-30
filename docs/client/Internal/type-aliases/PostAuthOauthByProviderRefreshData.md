# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:1503](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1503)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:1507](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1507)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1508](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1508)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1514](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1514)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:1515](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1515)
