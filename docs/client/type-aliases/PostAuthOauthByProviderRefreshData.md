# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:1122](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1122)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:1126](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1126)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1127](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1127)

#### provider

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1133](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1133)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:1134](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1134)
