# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:11537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11537)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11538)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11539)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11545)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:11551](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11551)
