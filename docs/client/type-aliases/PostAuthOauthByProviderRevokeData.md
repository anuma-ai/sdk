# PostAuthOauthByProviderRevokeData

> **PostAuthOauthByProviderRevokeData** = \{ `body`: [`HandlersRevokeRequest`](HandlersRevokeRequest.md); `path`: \{ `provider`: `string`; \}; `query?`: `never`; `url`: `"/auth/oauth/{provider}/revoke"`; \}

Defined in: [src/client/types.gen.ts:1185](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1185)

## Properties

### body

> **body**: [`HandlersRevokeRequest`](HandlersRevokeRequest.md)

Defined in: [src/client/types.gen.ts:1189](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1189)

Revoke request

***

### path

> **path**: \{ `provider`: `string`; \}

Defined in: [src/client/types.gen.ts:1190](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1190)

#### provider

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1196](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1196)

***

### url

> **url**: `"/auth/oauth/{provider}/revoke"`

Defined in: [src/client/types.gen.ts:1197](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1197)
