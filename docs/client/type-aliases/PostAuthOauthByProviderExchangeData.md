# PostAuthOauthByProviderExchangeData

> **PostAuthOauthByProviderExchangeData** = \{ `body`: [`HandlersExchangeRequest`](HandlersExchangeRequest.md); `path`: \{ `provider`: `string`; \}; `query?`: `never`; `url`: `"/auth/oauth/{provider}/exchange"`; \}

Defined in: [src/client/types.gen.ts:1433](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1433)

## Properties

### body

> **body**: [`HandlersExchangeRequest`](HandlersExchangeRequest.md)

Defined in: [src/client/types.gen.ts:1437](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1437)

Exchange request

***

### path

> **path**: \{ `provider`: `string`; \}

Defined in: [src/client/types.gen.ts:1438](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1438)

#### provider

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1444](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1444)

***

### url

> **url**: `"/auth/oauth/{provider}/exchange"`

Defined in: [src/client/types.gen.ts:1445](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1445)
