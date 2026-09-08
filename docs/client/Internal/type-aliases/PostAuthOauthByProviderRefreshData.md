# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:11423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11423)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:11427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11427)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11428)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:11434](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11434)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:11435](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11435)
