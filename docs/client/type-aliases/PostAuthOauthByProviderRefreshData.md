# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = \{ `body`: [`HandlersRefreshRequest`](HandlersRefreshRequest.md); `path`: \{ `provider`: `string`; \}; `query?`: `never`; `url`: `"/auth/oauth/{provider}/refresh"`; \}

Defined in: [src/client/types.gen.ts:1148](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1148)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:1152](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1152)

Refresh request

***

### path

> **path**: \{ `provider`: `string`; \}

Defined in: [src/client/types.gen.ts:1153](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1153)

#### provider

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1159](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1159)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:1160](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1160)
