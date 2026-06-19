# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9575)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9576](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9576)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9577](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9577)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9583)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9589)
