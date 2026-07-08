# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9936)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9937)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9938](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9938)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9944)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9950](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9950)
