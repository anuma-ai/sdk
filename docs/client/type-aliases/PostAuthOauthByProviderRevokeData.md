# PostAuthOauthByProviderRevokeData

> **PostAuthOauthByProviderRevokeData** = \{ `body`: [`HandlersRevokeRequest`](HandlersRevokeRequest.md); `path`: \{ `provider`: `string`; \}; `query?`: `never`; `url`: `"/auth/oauth/{provider}/revoke"`; \}

Defined in: [src/client/types.gen.ts:1507](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1507)

## Properties

### body

> **body**: [`HandlersRevokeRequest`](HandlersRevokeRequest.md)

Defined in: [src/client/types.gen.ts:1511](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1511)

Revoke request

***

### path

> **path**: \{ `provider`: `string`; \}

Defined in: [src/client/types.gen.ts:1512](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1512)

#### provider

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1518](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1518)

***

### url

> **url**: `"/auth/oauth/{provider}/revoke"`

Defined in: [src/client/types.gen.ts:1519](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1519)
