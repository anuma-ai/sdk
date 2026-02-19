# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2463](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2463)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2467](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2467)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2468](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2468)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2474](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2474)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2475](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2475)
