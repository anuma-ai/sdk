# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2439](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2439)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2443](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2443)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2444](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2444)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2450](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2450)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2451](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L2451)
